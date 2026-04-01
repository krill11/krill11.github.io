/**
 * Status card clouds: evenly spaced on a loop — one shared drift speed keeps spacing when wrapping.
 */
(function () {
    /** Add new files here as you drop them into /clouds */
    const CLOUD_URLS = ["clouds/cloud1.png"];

    const NUM_CLOUDS = 9;
    const NUM_LANES = 12;
    const DISPLAY_PX = 20;
    const VERTICAL_TOP_SHARE = 0.48;
    const DRIFT_SIGN = 1;
    const DRIFT_PX_PER_SEC = 22;

    /**
     * @param {number} a
     * @param {number} m
     */
    function posMod(a, m) {
        if (m <= 0) {
            return 0;
        }
        return ((a % m) + m) % m;
    }

    /**
     * @param {number[]} arr
     */
    function shuffleInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
        }
        return arr;
    }

    function init() {
        const card = document.querySelector('.card[data-section="status"]');
        const layer = card?.querySelector(".status-clouds");
        if (!card || !layer || CLOUD_URLS.length === 0) {
            return;
        }

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const laneIndices = shuffleInPlace(Array.from({ length: NUM_LANES }, (_, i) => i)).slice(
            0,
            NUM_CLOUDS
        );

        /** @type {{ img: HTMLImageElement; bob: number }[]} */
        const clouds = [];

        for (let i = 0; i < NUM_CLOUDS; i++) {
            const img = document.createElement("img");
            img.src = CLOUD_URLS[Math.floor(Math.random() * CLOUD_URLS.length)];
            img.alt = "";
            img.className = "status-cloud__img";
            img.draggable = false;

            const lane = laneIndices[i];
            const topPct = VERTICAL_TOP_SHARE * ((lane + 0.5) / NUM_LANES) * 100;
            img.style.top = `calc(${topPct}% - ${DISPLAY_PX / 2}px)`;

            layer.appendChild(img);

            clouds.push({
                img,
                bob: Math.random() * Math.PI * 2,
            });
        }

        let t0 = 0;
        let timeReady = false;
        let last = performance.now();
        const speed = DRIFT_PX_PER_SEC * DRIFT_SIGN;

        function frame(now) {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            const w = layer.clientWidth;
            if (w > 1) {
                if (!timeReady) {
                    t0 = now;
                    timeReady = true;
                }

                const wrapSpan = w + DISPLAY_PX * 2;
                const tSec = reducedMotion ? 0 : (now - t0) / 1000;
                const shift = speed * tSec;

                for (let i = 0; i < clouds.length; i++) {
                    const c = clouds[i];
                    const base = (i / NUM_CLOUDS) * wrapSpan;
                    const u = posMod(base + shift, wrapSpan);
                    const x = u - DISPLAY_PX;

                    if (!reducedMotion) {
                        c.bob += dt * 0.75;
                    }
                    const bobY = reducedMotion ? 0 : Math.sin(c.bob) * 2.5;
                    c.img.style.transform = `translate3d(${x}px, ${bobY}px, 0)`;
                }
            }

            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
