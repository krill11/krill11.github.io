document.addEventListener('DOMContentLoaded', function() {
    const circle = document.querySelector('.circle');
    const audioPlayer = document.getElementById('audio-player');
    const borderCanvas = document.getElementById('border-canvas');
    const ctx = borderCanvas.getContext('2d');

    // Northern Lights Setup
    const northernLights = document.getElementById('northern-lights');
    const gl = northernLights.getContext('webgl');
    let shaderProgram;
    let startTime;
    let animationStartTime;
    const ANIMATION_DURATION = 7 * 60 * 1000; // 7 minutes in milliseconds

    function initShaders() {
        // Vertex shader - simple pass-through
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        const vertexSource = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);

        // Fragment shader - aurora effect
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        const fragmentSource = `
            precision highp float;
            uniform float time;
            uniform vec2 resolution;
            uniform float intensity;

            mat2 mm2(in float a) {
                float c = cos(a), s = sin(a);
                return mat2(c,s,-s,c);
            }
            
            float tri(in float x) {
                return clamp(abs(fract(x)-.5),0.01,0.49);
            }
            
            vec2 tri2(in vec2 p) {
                return vec2(tri(p.x)+tri(p.y),tri(p.y+tri(p.x)));
            }

            float triNoise2d(in vec2 p, float spd) {
                float z=1.8;
                float z2=2.5;
                float rz = 0.;
                p *= mm2(p.x*0.06);
                vec2 bp = p;
                for (float i=0.; i<5.; i++ ) {
                    vec2 dg = tri2(bp*1.85)*.75;
                    dg *= mm2(time*spd);
                    p -= dg/z2;
                    bp *= 1.3;
                    z2 *= .45;
                    z *= .42;
                    p *= 1.21 + (rz-1.0)*.02;
                    rz += tri(p.x+tri(p.y))*z;
                    p*= -mm2(time*0.01);
                }
                return clamp(1./pow(rz*29., 1.3),0.,.55);
            }

            float hash21(in vec2 n) { 
                return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); 
            }

            vec4 aurora(vec3 ro, vec3 rd) {
                vec4 col = vec4(0);
                vec4 avgCol = vec4(0);
                
                for(float i=0.;i<50.;i++) {
                    float of = 0.006*hash21(gl_FragCoord.xy)*smoothstep(0.,15., i);
                    float pt = ((.8+pow(i,1.4)*.002)-ro.y)/(rd.y*2.+0.4);
                    pt -= of;
                    vec3 bpos = ro + pt*rd;
                    vec2 p = bpos.zx;
                    float rzt = triNoise2d(p, 0.06);
                    vec4 col2 = vec4(0,0,0, rzt);
                    
                    // Enhanced color variation for sky-like aurora
                    vec3 aurora_color = sin(1.-vec3(2.15,-.5, 1.2)+i*0.043)*0.5+0.5;
                    aurora_color += vec3(0.1, 0.4, 0.2); // Green base
                    aurora_color += vec3(0.0, 0.2, 0.1) * sin(time*0.1 + i*0.2); // Subtle color variation
                    col2.rgb = aurora_color * rzt;
                    
                    avgCol = mix(avgCol, col2, .5);
                    col += avgCol*exp2(-i*0.065 - 2.5)*smoothstep(0.,5., i);
                }
                
                // Adjust brightness for sky view
                return col*3.0;
            }

            void main() {
                vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
                
                // Position camera at ground level looking up
                vec3 ro = vec3(0, -5.0, -6.7);
                
                // Adjust ray direction to look upward
                vec3 rd = normalize(vec3(p.x, p.y + 1.5, 1.0));
                
                // Add camera movement
                rd.xz *= mm2(sin(time*0.05)*0.2);
                rd.xy *= mm2(cos(time*0.06)*0.1);
                
                vec4 aur = aurora(ro, rd);
                
                // Adjust the fade to create a proper sky gradient
                float sky_fade = smoothstep(-0.2, 0.8, rd.y);
                aur *= sky_fade;
                
                // Add a subtle blue tint to darker areas
                vec3 sky_color = vec3(0.02, 0.04, 0.1);
                vec3 final_color = mix(sky_color, aur.rgb, aur.a * sky_fade);
                
                gl_FragColor = vec4(final_color * intensity, 1.0);
            }
        `;
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        // Create shader program
        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        gl.useProgram(shaderProgram);

        // Set up vertices
        const vertices = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0
        ]);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(shaderProgram, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Get uniform locations
        shaderProgram.timeLocation = gl.getUniformLocation(shaderProgram, 'time');
        shaderProgram.resolutionLocation = gl.getUniformLocation(shaderProgram, 'resolution');
        shaderProgram.intensityLocation = gl.getUniformLocation(shaderProgram, 'intensity');
    }

    function resizeNorthernLights() {
        northernLights.width = window.innerWidth;
        northernLights.height = window.innerHeight;
        gl.viewport(0, 0, northernLights.width, northernLights.height);
    }

    function animateNorthernLights(timestamp) {
        if (!startTime) startTime = timestamp;
        if (!animationStartTime) animationStartTime = timestamp;

        const elapsed = timestamp - startTime;
        const animationProgress = (timestamp - animationStartTime) / ANIMATION_DURATION;
        const intensity = Math.min(animationProgress, 1.0);

        gl.uniform1f(shaderProgram.timeLocation, elapsed / 1000);
        gl.uniform2f(shaderProgram.resolutionLocation, northernLights.width, northernLights.height);
        gl.uniform1f(shaderProgram.intensityLocation, intensity);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(animateNorthernLights);
    }

    // Initialize WebGL
    initShaders();
    resizeNorthernLights();
    window.addEventListener('resize', resizeNorthernLights);

    // Set canvas size
    function resizeCanvas() {
        borderCanvas.width = window.innerWidth;
        borderCanvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let audioContext;
    let analyser;
    let source;
    let animationId;
    let isPlaying = false;

    circle.addEventListener('click', async function() {
        if (!isPlaying) {
            try {
                // Create and resume AudioContext on user interaction
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                await audioContext.resume();
                
                // Start playing audio
                try {
                    await audioPlayer.play();
                    circle.classList.add('active');
                    circle.style.transform = 'scale(1)'; // Force scale to 1
                    initAudioContext();
                    isPlaying = true;

                    // Start northern lights animation
                    northernLights.style.opacity = '1';
                    startTime = null;
                    animationStartTime = null;
                    requestAnimationFrame(animateNorthernLights);
                } catch (error) {
                    console.error('Error playing audio:', error);
                }
            } catch (error) {
                console.error('Error initializing audio context:', error);
            }
        }
    });

    function initAudioContext() {
        // Clean up previous audio context if it exists
        if (analyser) {
            cancelAnimationFrame(animationId);
        }

        if (!source) {
            analyser = audioContext.createAnalyser();
            source = audioContext.createMediaElementSource(audioPlayer);

            // Connect the audio nodes
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        }

        // Configure analyser
        analyser.fftSize = 512;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Animation function
        function animate() {
            const width = borderCanvas.width;
            const height = borderCanvas.height;
            ctx.clearRect(0, 0, width, height);

            // Get frequency data
            analyser.getByteFrequencyData(dataArray);

            // Calculate average frequency for effects
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            const normalizedAverage = average / 255; // Normalize to 0-1 range
            
            // Draw circular visualizer
            const centerX = width / 2;
            const centerY = height / 2;
            const baseRadius = 150; // Match the circle's radius (300px diameter / 2)

            // Create frequency visualization path
            let frequencyPath = new Path2D();
            for (let i = 0; i < bufferLength; i++) {
                const angle = (i / bufferLength) * Math.PI * 2;
                const value = dataArray[i] / 255;
                const radiusOffset = value * 50; // Reduced radius variation
                const x = centerX + Math.cos(angle) * (baseRadius + radiusOffset);
                const y = centerY + Math.sin(angle) * (baseRadius + radiusOffset);

                if (i === 0) {
                    frequencyPath.moveTo(x, y);
                } else {
                    frequencyPath.lineTo(x, y);
                }
            }
            frequencyPath.closePath();

            // Fill the entire area with white
            ctx.fillStyle = 'white';
            ctx.fill(frequencyPath);

            // Draw the border
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + normalizedAverage * 0.5})`; // Dynamic opacity
            ctx.lineWidth = 2 + normalizedAverage * 3; // Dynamic line width
            ctx.stroke(frequencyPath);

            // Add glow effect
            ctx.shadowBlur = 20 + normalizedAverage * 30;
            ctx.shadowColor = 'white';

            animationId = requestAnimationFrame(animate);
        }

        animate();

        // Handle audio ending
        audioPlayer.addEventListener('ended', function() {
            cancelAnimationFrame(animationId);
            circle.classList.remove('active');
            isPlaying = false;
            northernLights.style.opacity = '0';
        });
    }
}); 