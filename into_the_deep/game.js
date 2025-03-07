// Game constants
const FIELD_SIZE = 12 * 12; // 12x12 feet in inches
const CANVAS_SIZE = 800; // pixels
const SCALE = CANVAS_SIZE / FIELD_SIZE;

// Game timing constants
const AUTONOMOUS_PERIOD = 30000; // 30 seconds in milliseconds
const TELEOP_PERIOD = 120000; // 2 minutes in milliseconds

// Game state tracking
let gameStartTime = null;
let autonomousEndTime = null;
let gamePeriod = 'pre-game'; // 'pre-game', 'autonomous', 'teleop', 'ended'
let autonomousScoring = []; // Track scoring during autonomous
let gameActive = false;

// Canvas setup (moved to global scope)
let canvas;
let ctx;

// Pixel colors
const PIXEL_COLORS = {
    YELLOW: '#f39c12',
    BLUE: '#3498db',
    RED: '#e74c3c'
};

// Game elements
const ROBOT_SIZE = 14 * SCALE; // 14x14 inch robot
const PIXEL_WIDTH = 1.5 * SCALE; // 1.5 inch pixel width
const PIXEL_HEIGHT = 3.5 * SCALE; // 3.5 inch pixel height
const BASKET_WIDTH = (15 / 1.5) * SCALE; // Basket width (1.5 times smaller)
const BASKET_HEIGHT = (10 / 1.5) * SCALE; // Basket height (1.5 times smaller)
const LINEAR_SLIDE_LENGTH = 24 * SCALE; // Length of linear slides when extended
const OUTTAKE_LENGTH = 6 * SCALE; // Length of outtake extension
const INTAKE_RANGE = PIXEL_WIDTH * 3; // Increased range for easier intaking
const SLIDE_ANIMATION_DURATION = 500; // Animation duration in milliseconds
const TRANSFER_ANIMATION_DURATION = 1100; // 1.1 seconds in milliseconds

// Sample and tape line constants
const SAMPLE_SPACING = 10 * SCALE; // 10 inches between samples
const SAMPLE_WALL_DISTANCE = 2 * SCALE; // 2 inches from wall (restore original)
const SAMPLE_EDGE_DISTANCE = 46.25 * SCALE; // 46.25 inches from edge (moved 1.75 inches closer)
const TAPE_LINE_WIDTH = 4; // Same width as diagonal lines
const TAPE_LINE_LENGTH = PIXEL_HEIGHT; // Same length as pixel height (3.5 inches)

// Define sample positions
const leftSamples = [
    { x: SAMPLE_EDGE_DISTANCE, y: CANVAS_SIZE - SAMPLE_WALL_DISTANCE },
    { x: SAMPLE_EDGE_DISTANCE, y: CANVAS_SIZE - (SAMPLE_WALL_DISTANCE + SAMPLE_SPACING) },
    { x: SAMPLE_EDGE_DISTANCE, y: CANVAS_SIZE - (SAMPLE_WALL_DISTANCE + SAMPLE_SPACING * 2) }
];

const rightSamples = [
    { x: CANVAS_SIZE - SAMPLE_EDGE_DISTANCE, y: SAMPLE_WALL_DISTANCE },
    { x: CANVAS_SIZE - SAMPLE_EDGE_DISTANCE, y: SAMPLE_WALL_DISTANCE + SAMPLE_SPACING },
    { x: CANVAS_SIZE - SAMPLE_EDGE_DISTANCE, y: SAMPLE_WALL_DISTANCE + SAMPLE_SPACING * 2 }
];

// Define mirrored sample positions for red and blue samples
const rightRedSamples = rightSamples.map(sample => ({
    x: sample.x,
    y: CANVAS_SIZE - sample.y // Mirror across horizontal center line
}));

const leftBlueSamples = leftSamples.map(sample => ({
    x: sample.x,
    y: CANVAS_SIZE - sample.y // Mirror across horizontal center line
}));

// Robot movement constants
const MAX_SPEED = 75 * SCALE; // 75 inches per second
let STEERING_SENSITIVITY = 0.8; // Multiplier for turning speed (0.1 to 2.0 recommended)
let MAX_ANGULAR_SPEED = Math.PI * STEERING_SENSITIVITY; // Base: 180 degrees per second
const LINEAR_ACCELERATION = MAX_SPEED / 0.7; // Takes 0.7 seconds to reach max speed
const LINEAR_DECELERATION = MAX_SPEED * 2; // Stops in 0.5 seconds
let ANGULAR_ACCELERATION = MAX_ANGULAR_SPEED * 6; // Reaches max rotation in ~0.17 seconds
let ANGULAR_DECELERATION = MAX_ANGULAR_SPEED * 3; // Stops rotating in ~0.33 seconds
const LATERAL_FRICTION_MULTIPLIER = 2.5; // Higher friction for sideways movement

// Submersible zone dimensions
const SUBMERSIBLE_ZONE_WIDTH = 48 * SCALE; // 48 inch width
const SUBMERSIBLE_ZONE_HEIGHT = 29 * SCALE; // 29 inch height

// Game state
let score = 0;
let robot = {
    x: CANVAS_SIZE-SCALE*0.5,
    y: CANVAS_SIZE / 4, // Start in the top half of the field
    angle: 3*Math.PI/2, // in radians, 0 is facing right
    velocityX: 0, // Current X velocity
    velocityY: 0, // Current Y velocity
    angularVelocity: 0, // Current rotation speed
    hasPixel: true, // Set to true to start with a pixel
    pixelColor: PIXEL_COLORS.YELLOW, // Start with yellow pixel
    slidesExtended: false,
    slideAngle: 3*Math.PI/2, // Angle of the linear slides relative to robot
    slideExtension: 0, // Current extension of slides (0 to 1)
    slideAnimationStart: 0, // Timestamp for slide animation
    slideAnimationDirection: 'none', // 'extend', 'retract', or 'none'
    pixelPosition: 'front', // Set to 'front' since we're starting with a pixel
    transferAnimationStart: 0, // Timestamp for transfer animation
    transferProgress: 0, // Progress of transfer animation (0 to 1)
    startExtension: 0 // Store current extension as starting point
};

// Dropped pixels on the floor
const droppedPixels = [];

// Pixels in baskets
const basketPixels = [[], []]; // Array of arrays, one for each basket

// Field elements
const submersibleZone = {
    x: CANVAS_SIZE / 2,
    y: CANVAS_SIZE / 2,
    width: SUBMERSIBLE_ZONE_WIDTH,
    height: SUBMERSIBLE_ZONE_HEIGHT,
    braceLength: 8 * SCALE, // 8 inch braces
    braceWidth: 2 * SCALE // 2 inch thick braces
};

// Generate pixels
const pixels = [];
function generatePixels() {
    // Clear existing pixels
    pixels.length = 0;
    
    // Calculate boundaries for pixel placement within submersible zone
    const minX = submersibleZone.x - submersibleZone.width/2 + PIXEL_HEIGHT;
    const maxX = submersibleZone.x + submersibleZone.width/2 - PIXEL_HEIGHT;
    const minY = submersibleZone.y - submersibleZone.height/2 + PIXEL_HEIGHT;
    const maxY = submersibleZone.y + submersibleZone.height/2 - PIXEL_HEIGHT;
    
    // Define target counts for each color
    const targetCounts = {
        [PIXEL_COLORS.YELLOW]: 30,
        [PIXEL_COLORS.BLUE]: 15,
        [PIXEL_COLORS.RED]: 15
    };
    
    const placedPixels = [];
    
    // Function to check if a position and rotation overlaps with existing pixels
    function checkOverlap(x, y, rotation) {
        const minSpacing = PIXEL_HEIGHT * 1.1; // Minimum spacing between pixels
        const testPixel = { x, y, rotation };
        
        // Create corners for the test pixel
        const testCorners = [
            {x: -PIXEL_WIDTH/2, y: -PIXEL_HEIGHT/2},
            {x: PIXEL_WIDTH/2, y: -PIXEL_HEIGHT/2},
            {x: PIXEL_WIDTH/2, y: PIXEL_HEIGHT/2},
            {x: -PIXEL_WIDTH/2, y: PIXEL_HEIGHT/2}
        ].map(corner => {
            const rotatedX = corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation);
            const rotatedY = corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation);
            return {
                x: x + rotatedX,
                y: y + rotatedY
            };
        });
        
        // Check against each placed pixel
        for (const pixel of placedPixels) {
            const pixelCorners = [
                {x: -PIXEL_WIDTH/2, y: -PIXEL_HEIGHT/2},
                {x: PIXEL_WIDTH/2, y: -PIXEL_HEIGHT/2},
                {x: PIXEL_WIDTH/2, y: PIXEL_HEIGHT/2},
                {x: -PIXEL_WIDTH/2, y: PIXEL_HEIGHT/2}
            ].map(corner => {
                const rotatedX = corner.x * Math.cos(pixel.rotation) - corner.y * Math.sin(pixel.rotation);
                const rotatedY = corner.x * Math.sin(pixel.rotation) + corner.y * Math.cos(pixel.rotation);
                return {
                    x: pixel.x + rotatedX,
                    y: pixel.y + rotatedY
                };
            });
            
            // Use SAT collision detection
            if (!findSeparatingAxis(testCorners, pixelCorners) && !findSeparatingAxis(pixelCorners, testCorners)) {
                return true;
            }
        }
        return false;
    }
    
    // Function to try placing a pixel with different rotations
    function tryPlacePixel(x, y) {
        // Try 20 completely random rotations
        for (let i = 0; i < 20; i++) {
            // Generate a completely random rotation between 0 and 2π
            const rotation = Math.random() * Math.PI * 2;
            
            if (!checkOverlap(x, y, rotation)) {
                return rotation;
            }
        }
        
        // If no valid rotation was found, return null to indicate failure
        return null;
    }
    
    // Place pixels color by color
    const colors = [
        { color: PIXEL_COLORS.YELLOW, count: targetCounts[PIXEL_COLORS.YELLOW] },
        { color: PIXEL_COLORS.BLUE, count: targetCounts[PIXEL_COLORS.BLUE] },
        { color: PIXEL_COLORS.RED, count: targetCounts[PIXEL_COLORS.RED] }
    ];
    
    // Try random placement first, then fall back to grid if needed
    for (const colorInfo of colors) {
        let placed = 0;
        let randomAttempts = 0;
        const maxRandomAttempts = 200; // Try random placement first
        
        // First attempt: Random placement with more variation
        while (placed < colorInfo.count && randomAttempts < maxRandomAttempts) {
            const x = minX + Math.random() * (maxX - minX);
            const y = minY + Math.random() * (maxY - minY);
            const validRotation = tryPlacePixel(x, y);
            
            if (validRotation !== null) {
                const pixel = {
                    x: x,
                    y: y,
                    rotation: validRotation,
                    color: colorInfo.color,
                    active: true
                };
                placedPixels.push(pixel);
                placed++;
            }
            randomAttempts++;
        }
        
        // If random placement didn't place all pixels, fall back to grid-based placement
        if (placed < colorInfo.count) {
            const gridSpacing = PIXEL_HEIGHT * 1.1;
            const gridCols = Math.floor((maxX - minX) / gridSpacing);
            const gridRows = Math.floor((maxY - minY) / gridSpacing);
            
            // Add some randomness to grid positions
            const gridOffsetRange = gridSpacing * 0.3; // 30% of grid spacing
            
            for (let row = 0; row < gridRows && placed < colorInfo.count; row++) {
                for (let col = 0; col < gridCols && placed < colorInfo.count; col++) {
                    // Add random offset to grid position
                    const offsetX = (Math.random() - 0.5) * gridOffsetRange;
                    const offsetY = (Math.random() - 0.5) * gridOffsetRange;
                    
                    const x = minX + col * gridSpacing + offsetX;
                    const y = minY + row * gridSpacing + offsetY;
                    
                    const validRotation = tryPlacePixel(x, y);
                    if (validRotation !== null) {
                        const pixel = {
                            x: x,
                            y: y,
                            rotation: validRotation,
                            color: colorInfo.color,
                            active: true
                        };
                        placedPixels.push(pixel);
                        placed++;
                    }
                }
            }
        }
    }
    
    // Add all placed pixels to the game
    pixels.push(...placedPixels);
}

// Baskets in opposite corners with 45-degree rotation
const BASKET_DIAGONAL_OFFSET = (BASKET_WIDTH * Math.SQRT2) / 2; // Distance from corner to basket center
const baskets = [
    { x: CANVAS_SIZE - BASKET_DIAGONAL_OFFSET, y: BASKET_DIAGONAL_OFFSET, angle: Math.PI/4 }, // Top-right
    { x: BASKET_DIAGONAL_OFFSET, y: CANVAS_SIZE - BASKET_DIAGONAL_OFFSET, angle: Math.PI/4 }  // Bottom-left
];

// Input handling
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
    space: false,
    i: false
};

// Event listeners
document.addEventListener('keydown', (e) => {
    // Start game on first control input
    startGame();

    if (e.key.toLowerCase() === 'w') keys.w = true;
    if (e.key.toLowerCase() === 'a') keys.a = true;
    if (e.key.toLowerCase() === 's') keys.s = true;
    if (e.key.toLowerCase() === 'd') keys.d = true;
    if (e.key.toLowerCase() === 'q') keys.q = true;
    if (e.key.toLowerCase() === 'e') keys.e = true;
    if (e.key === ' ' && !keys.space) {
        keys.space = true;
        // Only start extending if we're not already in the middle of an animation
        if (robot.slideAnimationDirection === 'none' || robot.slideAnimationDirection === 'retract') {
            startSlideExtension();
        }
    }
    if (e.key.toLowerCase() === 'i') {
        keys.i = true;
        // Only handle outtake if we have a pixel at the front
        if (robot.hasPixel && robot.pixelPosition === 'front') {
            handleOuttake();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'w') keys.w = false;
    if (e.key.toLowerCase() === 'a') keys.a = false;
    if (e.key.toLowerCase() === 's') keys.s = false;
    if (e.key.toLowerCase() === 'd') keys.d = false;
    if (e.key.toLowerCase() === 'q') keys.q = false;
    if (e.key.toLowerCase() === 'e') keys.e = false;
    if (e.key === ' ') {
        keys.space = false;
        // Only start retracting if we're not already retracting
        if (robot.slideAnimationDirection === 'none' || robot.slideAnimationDirection === 'extend') {
            startSlideRetraction();
        }
    }
    if (e.key.toLowerCase() === 'i') {
        keys.i = false;
    }
});

// Game functions
function startSlideExtension() {
    // Store current extension as starting point when reversing from retraction
    robot.startExtension = robot.slideExtension;
    robot.slideAnimationDirection = 'extend';
    robot.slideAnimationStart = Date.now();
    robot.slideAngle = robot.angle + Math.PI; // Slides extend from back
}

function startSlideRetraction() {
    // Only retract if slides are at least partially extended
    if (robot.slideExtension > 0) {
        robot.slideAnimationDirection = 'retract';
        robot.slideAnimationStart = Date.now();
        robot.startExtension = robot.slideExtension; // Store current extension as starting point
        
        // Try to intake a pixel if we don't have one
        if (!robot.hasPixel) {
            handleIntake();
        }
    }
}

function updateSlideAnimation() {
    if (robot.slideAnimationDirection === 'none') return;
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - robot.slideAnimationStart;
    const progress = Math.min(elapsedTime / SLIDE_ANIMATION_DURATION, 1);
    
    if (robot.slideAnimationDirection === 'extend') {
        // Calculate potential new extension
        const newExtension = robot.startExtension + (1 - robot.startExtension) * progress;
        
        // Check multiple points along the slide length for collisions
        const numPoints = 5; // Check 5 points along the slide length
        const slideStartX = robot.x;
        const slideStartY = robot.y;
        const slideEndX = robot.x + Math.cos(robot.slideAngle) * (LINEAR_SLIDE_LENGTH * newExtension);
        const slideEndY = robot.y + Math.sin(robot.slideAngle) * (LINEAR_SLIDE_LENGTH * newExtension);
        
        // Check both slide rails
        const slideOffset = ROBOT_SIZE * 0.3; // Same offset used in drawing
        const leftRailStart = {
            x: slideStartX + Math.cos(robot.slideAngle + Math.PI/2) * slideOffset,
            y: slideStartY + Math.sin(robot.slideAngle + Math.PI/2) * slideOffset
        };
        const leftRailEnd = {
            x: slideEndX + Math.cos(robot.slideAngle + Math.PI/2) * slideOffset,
            y: slideEndY + Math.sin(robot.slideAngle + Math.PI/2) * slideOffset
        };
        const rightRailStart = {
            x: slideStartX + Math.cos(robot.slideAngle - Math.PI/2) * slideOffset,
            y: slideStartY + Math.sin(robot.slideAngle - Math.PI/2) * slideOffset
        };
        const rightRailEnd = {
            x: slideEndX + Math.cos(robot.slideAngle - Math.PI/2) * slideOffset,
            y: slideEndY + Math.sin(robot.slideAngle - Math.PI/2) * slideOffset
        };
        
        // Check if either rail intersects with braces
        if (lineIntersectsBraces(leftRailStart, leftRailEnd) || 
            lineIntersectsBraces(rightRailStart, rightRailEnd) ||
            lineIntersectsBraces({x: slideStartX, y: slideStartY}, {x: slideEndX, y: slideEndY})) {
            robot.slideAnimationDirection = 'none';
            return;
        }
        
        // Also check the crossbar at the end
        const crossbarStart = leftRailEnd;
        const crossbarEnd = rightRailEnd;
        if (lineIntersectsBraces(crossbarStart, crossbarEnd)) {
            robot.slideAnimationDirection = 'none';
            return;
        }
        
        // If no collision, apply new extension
        robot.slideExtension = newExtension;
        
        if (progress >= 1) {
            robot.slideExtension = 1;
            robot.slidesExtended = true;
            if (!keys.space) {
                robot.slideAnimationDirection = 'none';
            }
        }
        
        if (!keys.space && progress < 1) {
            startSlideRetraction();
        }
    } else if (robot.slideAnimationDirection === 'retract') {
        // Retraction is always safe
        robot.slideExtension = robot.startExtension * (1 - progress);
        
        if (progress >= 1) {
            robot.slideExtension = 0;
            robot.slidesExtended = false;
            robot.slideAnimationDirection = 'none';
            
            if (robot.hasPixel && robot.pixelPosition === 'slides') {
                startTransferAnimation();
            }
        }
        
        if (keys.space && progress < 1) {
            startSlideExtension();
        }
    }
}

function startTransferAnimation() {
    robot.pixelPosition = 'transferring';
    robot.transferAnimationStart = Date.now();
    robot.transferProgress = 0;
}

function updateTransferAnimation() {
    if (robot.pixelPosition !== 'transferring') return;
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - robot.transferAnimationStart;
    robot.transferProgress = Math.min(elapsedTime / TRANSFER_ANIMATION_DURATION, 1);
    
    if (robot.transferProgress >= 1) {
        robot.pixelPosition = 'front';
        robot.transferProgress = 0;
    }
}

function handleIntake() {
    // Try to intake a pixel with the linear slides
    const slideEndX = robot.x + Math.cos(robot.slideAngle) * (LINEAR_SLIDE_LENGTH * robot.slideExtension);
    const slideEndY = robot.y + Math.sin(robot.slideAngle) * (LINEAR_SLIDE_LENGTH * robot.slideExtension);
    
    // First check active pixels in the submersible zone
    for (const pixel of pixels) {
        if (!pixel.active) continue;
        
        // Calculate distance from slide end to pixel
        const distance = Math.sqrt(
            Math.pow(slideEndX - pixel.x, 2) + 
            Math.pow(slideEndY - pixel.y, 2)
        );
        
        if (distance < INTAKE_RANGE) {
            robot.hasPixel = true;
            robot.pixelColor = pixel.color;
            robot.pixelPosition = 'slides';
            pixel.active = false;
            return;
        }
    }
    
    // Then check dropped pixels on the floor
    for (let i = 0; i < droppedPixels.length; i++) {
        const pixel = droppedPixels[i];
        
        // Calculate distance from slide end to pixel
        const distance = Math.sqrt(
            Math.pow(slideEndX - pixel.x, 2) + 
            Math.pow(slideEndY - pixel.y, 2)
        );
        
        if (distance < INTAKE_RANGE) {
            robot.hasPixel = true;
            robot.pixelColor = pixel.color;
            robot.pixelPosition = 'slides';
            droppedPixels.splice(i, 1); // Remove from dropped pixels
            return;
        }
    }
}

function handleOuttake() {
    if (!gameActive) return; // Don't allow scoring if game hasn't started or has ended

    // Calculate the position of the outtake end (extended from front of robot)
    const outtakeEndX = robot.x + Math.cos(robot.angle) * (ROBOT_SIZE/2 + OUTTAKE_LENGTH);
    const outtakeEndY = robot.y + Math.sin(robot.angle) * (ROBOT_SIZE/2 + OUTTAKE_LENGTH);
    
    // Check if outtake end is touching a basket
    let scoredPixel = false;
    
    for (let i = 0; i < baskets.length; i++) {
        const basket = baskets[i];
        // Calculate distance from outtake end to basket center
        const distance = Math.sqrt(
            Math.pow(outtakeEndX - basket.x, 2) + 
            Math.pow(outtakeEndY - basket.y, 2)
        );
        
        // Check if the outtake end is inside the basket
        if (distance < Math.max(BASKET_WIDTH, BASKET_HEIGHT)/2) {
            // Convert global position to basket-local position
            const dx = outtakeEndX - basket.x;
            const dy = outtakeEndY - basket.y;
            // Rotate point to basket's local coordinate system
            const localX = dx * Math.cos(-basket.angle) - dy * Math.sin(-basket.angle);
            const localY = dx * Math.sin(-basket.angle) + dy * Math.cos(-basket.angle);
            
            // Score the pixel and add it to the basket's stack
            scoredPixel = true;
            // Apply score based on pixel color
            let points = 0;
            if (robot.pixelColor === PIXEL_COLORS.BLUE) {
                points = -15; // Penalty for blue pixels
            } else {
                points = 8; // Normal score for other colors
            }
            
            // Track scoring during autonomous
            if (gamePeriod === 'autonomous') {
                autonomousScoring.push(points);
            }
            
            score += points;
            document.getElementById('score').textContent = score;
            
            // Constrain pixel position within basket bounds with margin
            const margin = PIXEL_WIDTH/2;
            const maxWidth = BASKET_WIDTH/2 - margin;
            const constrainedX = Math.max(-maxWidth, Math.min(maxWidth, localX));
            
            // Find stack height at this position
            const stackHeight = getStackHeightAt(i, constrainedX);
            
            // Calculate maximum safe height to prevent overflow
            const maxStackHeight = Math.floor((BASKET_HEIGHT - margin) / (PIXEL_HEIGHT * 0.8));
            
            // Only add pixel if there's room in the stack
            if (stackHeight < maxStackHeight) {
                // Add pixel to basket's stack with position information
                basketPixels[i].push({
                    color: robot.pixelColor,
                    x: constrainedX,
                    y: -BASKET_HEIGHT/2 + PIXEL_HEIGHT/2 + stackHeight * PIXEL_HEIGHT * 0.8,
                    rotation: robot.angle + Math.PI/2 // Keep original orientation relative to field
                });
            } else {
                // If stack is full, drop the pixel outside instead
                scoredPixel = false;
            }
            break;
        }
    }
    
    if (!scoredPixel) {
        // Drop the pixel on the floor at the outtake end position
        droppedPixels.push({
            x: outtakeEndX,
            y: outtakeEndY,
            rotation: robot.angle + Math.PI/2,
            color: robot.pixelColor
        });
    }
    
    // Reset robot pixel state
    robot.hasPixel = false;
    robot.pixelColor = null;
    robot.pixelPosition = 'none';
}

// Helper function to get the stack height at a specific x position in the basket
function getStackHeightAt(basketIndex, x) {
    const pixels = basketPixels[basketIndex];
    let stackHeight = 0;
    
    // Consider a pixel part of this stack if it's within one pixel width
    const stackWidth = PIXEL_WIDTH * 1.2; // Allow slight overlap
    
    pixels.forEach(pixel => {
        if (Math.abs(pixel.x - x) < stackWidth/2) {
            stackHeight++;
        }
    });
    
    return stackHeight;
}

function updateRobot() {
    // Update animations
    updateSlideAnimation();
    updateTransferAnimation();
    
    // Get time delta for smooth movement (assuming 60 FPS if not available)
    const deltaTime = 1/60;
    
    // Calculate desired velocities based on input
    let targetVelocityX = 0;
    let targetVelocityY = 0;
    let targetAngularVelocity = 0;
    
    // Forward/backward movement
    if (keys.w) {
        targetVelocityX += Math.cos(robot.angle) * MAX_SPEED;
        targetVelocityY += Math.sin(robot.angle) * MAX_SPEED;
    }
    if (keys.s) {
        targetVelocityX += -Math.cos(robot.angle) * MAX_SPEED;
        targetVelocityY += -Math.sin(robot.angle) * MAX_SPEED;
    }
    
    // Strafing movement (50% acceleration)
    if (keys.q) {
        targetVelocityX += Math.cos(robot.angle - Math.PI/2) * MAX_SPEED;
        targetVelocityY += Math.sin(robot.angle - Math.PI/2) * MAX_SPEED;
    }
    if (keys.e) {
        targetVelocityX += Math.cos(robot.angle + Math.PI/2) * MAX_SPEED;
        targetVelocityY += Math.sin(robot.angle + Math.PI/2) * MAX_SPEED;
    }
    
    // Rotation
    if (keys.a) {
        targetAngularVelocity = -MAX_ANGULAR_SPEED;
    }
    if (keys.d) {
        targetAngularVelocity = MAX_ANGULAR_SPEED;
    }
    
    // Apply acceleration/deceleration to linear velocity
    const currentSpeed = Math.sqrt(robot.velocityX * robot.velocityX + robot.velocityY * robot.velocityY);
    const targetSpeed = Math.sqrt(targetVelocityX * targetVelocityX + targetVelocityY * targetVelocityY);
    
    if (targetSpeed > 0) {
        // Calculate acceleration direction
        const dirX = targetVelocityX / targetSpeed;
        const dirY = targetVelocityY / targetSpeed;
        
        // Apply acceleration in the target direction (50% for strafing)
        let acceleration = LINEAR_ACCELERATION;
        if ((keys.q || keys.e) && !(keys.w || keys.s)) {
            acceleration *= 0.5; // 50% acceleration for pure strafing
        }
        acceleration *= deltaTime;
        
        robot.velocityX += dirX * acceleration;
        robot.velocityY += dirY * acceleration;
        
        // Cap speed at target speed
        const newSpeed = Math.sqrt(robot.velocityX * robot.velocityX + robot.velocityY * robot.velocityY);
        if (newSpeed > targetSpeed) {
            const scale = targetSpeed / newSpeed;
            robot.velocityX *= scale;
            robot.velocityY *= scale;
        }
    } else {
        // Apply anisotropic friction
        const robotDirX = Math.cos(robot.angle);
        const robotDirY = Math.sin(robot.angle);
        
        // Decompose velocity into forward and lateral components
        const forwardVel = robot.velocityX * robotDirX + robot.velocityY * robotDirY;
        const lateralVel = robot.velocityX * -robotDirY + robot.velocityY * robotDirX;
        
        // Apply different deceleration rates
        const forwardDecel = LINEAR_DECELERATION * deltaTime;
        const lateralDecel = LINEAR_DECELERATION * LATERAL_FRICTION_MULTIPLIER * deltaTime;
        
        // Update forward velocity
        const newForwardVel = Math.abs(forwardVel) <= forwardDecel ? 0 : 
            forwardVel > 0 ? forwardVel - forwardDecel : forwardVel + forwardDecel;
        
        // Update lateral velocity
        const newLateralVel = Math.abs(lateralVel) <= lateralDecel ? 0 : 
            lateralVel > 0 ? lateralVel - lateralDecel : lateralVel + lateralDecel;
        
        // Recombine velocities
        robot.velocityX = newForwardVel * robotDirX - newLateralVel * robotDirY;
        robot.velocityY = newForwardVel * robotDirY + newLateralVel * robotDirX;
    }
    
    // Apply acceleration/deceleration to angular velocity
    if (targetAngularVelocity !== 0) {
        // Apply angular acceleration
        const angularAcceleration = ANGULAR_ACCELERATION * deltaTime;
        if (targetAngularVelocity > robot.angularVelocity) {
            robot.angularVelocity = Math.min(targetAngularVelocity, robot.angularVelocity + angularAcceleration);
        } else {
            robot.angularVelocity = Math.max(targetAngularVelocity, robot.angularVelocity - angularAcceleration);
        }
    } else {
        // Apply angular deceleration
        const angularDeceleration = ANGULAR_DECELERATION * deltaTime;
        if (Math.abs(robot.angularVelocity) <= angularDeceleration) {
            robot.angularVelocity = 0;
        } else if (robot.angularVelocity > 0) {
            robot.angularVelocity -= angularDeceleration;
        } else {
            robot.angularVelocity += angularDeceleration;
        }
    }
    
    // Calculate new position and angle
    const newX = robot.x + robot.velocityX * deltaTime;
    const newY = robot.y + robot.velocityY * deltaTime;
    const newAngle = robot.angle + robot.angularVelocity * deltaTime;
    
    // Check collisions
    let canMove = true;
    let canRotate = true;
    
    if (robot.velocityX !== 0 || robot.velocityY !== 0) {
        const robotCornersAfterMove = getRobotCorners(newX, newY, robot.angle);
        
        // Check submersible zone collision
        if (wouldCollideWithSubmersibleZone(robotCornersAfterMove)) {
            canMove = false;
            robot.velocityX = 0;
            robot.velocityY = 0;
        }
        
        // Check basket collisions
        for (let i = 0; i < baskets.length; i++) {
            if (wouldCollideWithBasket(robotCornersAfterMove, i)) {
                canMove = false;
                robot.velocityX = 0;
                robot.velocityY = 0;
                break;
            }
        }

        // Check slide collisions if extended
        if (canMove && robot.slideExtension > 0) {
            const slideOffset = ROBOT_SIZE * 0.3;
            const currentSlideLength = LINEAR_SLIDE_LENGTH * robot.slideExtension;
            
            // Check multiple points along the movement path
            const numSteps = 5;
            for (let step = 0; step <= numSteps; step++) {
                const t = step / numSteps;
                const intermediateX = robot.x + (newX - robot.x) * t;
                const intermediateY = robot.y + (newY - robot.y) * t;
                
                // Calculate intermediate slide positions
                const intermediateLeftRailStart = {
                    x: intermediateX + Math.cos(robot.slideAngle + Math.PI/2) * slideOffset,
                    y: intermediateY + Math.sin(robot.slideAngle + Math.PI/2) * slideOffset
                };
                const intermediateLeftRailEnd = {
                    x: intermediateX + Math.cos(robot.slideAngle) * currentSlideLength + Math.cos(robot.slideAngle + Math.PI/2) * slideOffset,
                    y: intermediateY + Math.sin(robot.slideAngle) * currentSlideLength + Math.sin(robot.slideAngle + Math.PI/2) * slideOffset
                };
                const intermediateRightRailStart = {
                    x: intermediateX + Math.cos(robot.slideAngle - Math.PI/2) * slideOffset,
                    y: intermediateY + Math.sin(robot.slideAngle - Math.PI/2) * slideOffset
                };
                const intermediateRightRailEnd = {
                    x: intermediateX + Math.cos(robot.slideAngle) * currentSlideLength + Math.cos(robot.slideAngle - Math.PI/2) * slideOffset,
                    y: intermediateY + Math.sin(robot.slideAngle) * currentSlideLength + Math.sin(robot.slideAngle - Math.PI/2) * slideOffset
                };
                
                // Check if any part of the slides would intersect with braces
                if (lineIntersectsBraces(intermediateLeftRailStart, intermediateLeftRailEnd) || 
                    lineIntersectsBraces(intermediateRightRailStart, intermediateRightRailEnd) ||
                    lineIntersectsBraces(
                        {x: intermediateX, y: intermediateY},
                        {x: intermediateX + Math.cos(robot.slideAngle) * currentSlideLength,
                         y: intermediateY + Math.sin(robot.slideAngle) * currentSlideLength}
                    ) ||
                    lineIntersectsBraces(intermediateLeftRailEnd, intermediateRightRailEnd)) {
                    canMove = false;
                    robot.velocityX = 0;
                    robot.velocityY = 0;
                    break;
                }
            }
        }
    }
    
    // Check rotation collisions
    if (robot.angularVelocity !== 0) {
        const robotCornersAfterRotation = getRobotCorners(robot.x, robot.y, newAngle);
        
        // Check submersible zone collision
        if (wouldCollideWithSubmersibleZone(robotCornersAfterRotation)) {
            canRotate = false;
            robot.angularVelocity = 0;
        }
        
        // Check basket collisions
        for (let i = 0; i < baskets.length; i++) {
            if (wouldCollideWithBasket(robotCornersAfterRotation, i)) {
                canRotate = false;
                robot.angularVelocity = 0;
                break;
            }
        }
        
        // Check slide collisions if extended
        if (canRotate && robot.slideExtension > 0) {
            const slideOffset = ROBOT_SIZE * 0.3;
            const currentSlideLength = LINEAR_SLIDE_LENGTH * robot.slideExtension;
            
            // Check multiple points along the rotation arc
            const numSteps = 10;
            for (let step = 0; step <= numSteps; step++) {
                const t = step / numSteps;
                const intermediateAngle = robot.angle + (newAngle - robot.angle) * t;
                const intermediateSlideAngle = intermediateAngle + Math.PI;
                
                // Calculate slide endpoints at this rotation
                const leftRailStart = {
                    x: robot.x + Math.cos(intermediateSlideAngle + Math.PI/2) * slideOffset,
                    y: robot.y + Math.sin(intermediateSlideAngle + Math.PI/2) * slideOffset
                };
                const leftRailEnd = {
                    x: robot.x + Math.cos(intermediateSlideAngle) * currentSlideLength + Math.cos(intermediateSlideAngle + Math.PI/2) * slideOffset,
                    y: robot.y + Math.sin(intermediateSlideAngle) * currentSlideLength + Math.sin(intermediateSlideAngle + Math.PI/2) * slideOffset
                };
                const rightRailStart = {
                    x: robot.x + Math.cos(intermediateSlideAngle - Math.PI/2) * slideOffset,
                    y: robot.y + Math.sin(intermediateSlideAngle - Math.PI/2) * slideOffset
                };
                const rightRailEnd = {
                    x: robot.x + Math.cos(intermediateSlideAngle) * currentSlideLength + Math.cos(intermediateSlideAngle - Math.PI/2) * slideOffset,
                    y: robot.y + Math.sin(intermediateSlideAngle) * currentSlideLength + Math.sin(intermediateSlideAngle - Math.PI/2) * slideOffset
                };
                
                // Check if any part of the slides would intersect with braces
                if (lineIntersectsBraces(leftRailStart, leftRailEnd) || 
                    lineIntersectsBraces(rightRailStart, rightRailEnd) ||
                    lineIntersectsBraces(
                        {x: robot.x, y: robot.y},
                        {x: robot.x + Math.cos(intermediateSlideAngle) * currentSlideLength,
                         y: robot.y + Math.sin(intermediateSlideAngle) * currentSlideLength}
                    ) ||
                    lineIntersectsBraces(leftRailEnd, rightRailEnd)) {
                    canRotate = false;
                    robot.angularVelocity = 0;
                    break;
                }
            }
        }
    }
    
    // Apply movement and rotation if allowed
    if (canMove) {
        robot.x = newX;
        robot.y = newY;
        
        // Update positions of pixels that are being pushed
        const robotCorners = getRobotCorners(robot.x, robot.y, robot.angle);
        
        // First pass: Calculate new positions for all affected pixels
        const pixelMoves = [];
        droppedPixels.forEach((pixel, index) => {
            if (isPixelCollidingWithRobot(pixel, robotCorners)) {
                // Calculate push direction from robot center to pixel
                const dx = pixel.x - robot.x;
                const dy = pixel.y - robot.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Normalize direction
                const pushDirX = dist > 0 ? dx / dist : 0;
                const pushDirY = dist > 0 ? dy / dist : 0;
                
                // Calculate new position (push slightly away from robot)
                const pushDistance = ROBOT_SIZE/2 + PIXEL_HEIGHT/2;
                const newPixelX = robot.x + pushDirX * pushDistance;
                const newPixelY = robot.y + pushDirY * pushDistance;
                
                // Keep pixel within field bounds
                const boundedX = Math.max(PIXEL_HEIGHT/2, Math.min(CANVAS_SIZE - PIXEL_HEIGHT/2, newPixelX));
                const boundedY = Math.max(PIXEL_HEIGHT/2, Math.min(CANVAS_SIZE - PIXEL_HEIGHT/2, newPixelY));
                
                pixelMoves.push({
                    index,
                    newX: boundedX,
                    newY: boundedY
                });
            }
        });
        
        // Second pass: Check for collisions between pixels at their new positions
        pixelMoves.forEach(move => {
            const pixel = droppedPixels[move.index];
            const originalX = pixel.x;
            const originalY = pixel.y;
            
            // Temporarily update position
            pixel.x = move.newX;
            pixel.y = move.newY;
            
            // Check collisions with other pixels
            let hasCollision = false;
            droppedPixels.forEach((otherPixel, otherIndex) => {
                if (move.index !== otherIndex) {
                    const dx = pixel.x - otherPixel.x;
                    const dy = pixel.y - otherPixel.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < PIXEL_HEIGHT) {
                        hasCollision = true;
                    }
                }
            });
            
            // If there's a collision, try to find a nearby non-colliding position
            if (hasCollision) {
                const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
                let foundValidPosition = false;
                
                for (const angle of angles) {
                    const testX = robot.x + Math.cos(angle) * (ROBOT_SIZE/2 + PIXEL_HEIGHT);
                    const testY = robot.y + Math.sin(angle) * (ROBOT_SIZE/2 + PIXEL_HEIGHT);
                    
                    // Keep within bounds
                    const boundedX = Math.max(PIXEL_HEIGHT/2, Math.min(CANVAS_SIZE - PIXEL_HEIGHT/2, testX));
                    const boundedY = Math.max(PIXEL_HEIGHT/2, Math.min(CANVAS_SIZE - PIXEL_HEIGHT/2, testY));
                    
                    // Test this position
                    pixel.x = boundedX;
                    pixel.y = boundedY;
                    
                    let positionValid = true;
                    droppedPixels.forEach((otherPixel, otherIndex) => {
                        if (move.index !== otherIndex) {
                            const dx = pixel.x - otherPixel.x;
                            const dy = pixel.y - otherPixel.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance < PIXEL_HEIGHT) {
                                positionValid = false;
                            }
                        }
                    });
                    
                    if (positionValid) {
                        foundValidPosition = true;
                        break;
                    }
                }
                
                // If no valid position found, revert to original position
                if (!foundValidPosition) {
                    pixel.x = originalX;
                    pixel.y = originalY;
                }
            }
        });
    }
    
    if (canRotate) {
        robot.angle = newAngle;
        // Always update slide angle when slides are extended or extending
        if (robot.slideExtension > 0 || robot.slideAnimationDirection === 'extend') {
            robot.slideAngle = robot.angle + Math.PI;
        }
    }
    
    // Keep robot within field bounds and stop velocity if hitting walls
    if (robot.x < ROBOT_SIZE/2) {
        robot.x = ROBOT_SIZE/2;
        robot.velocityX = Math.max(0, robot.velocityX);
    }
    if (robot.x > CANVAS_SIZE - ROBOT_SIZE/2) {
        robot.x = CANVAS_SIZE - ROBOT_SIZE/2;
        robot.velocityX = Math.min(0, robot.velocityX);
    }
    if (robot.y < ROBOT_SIZE/2) {
        robot.y = ROBOT_SIZE/2;
        robot.velocityY = Math.max(0, robot.velocityY);
    }
    if (robot.y > CANVAS_SIZE - ROBOT_SIZE/2) {
        robot.y = CANVAS_SIZE - ROBOT_SIZE/2;
        robot.velocityY = Math.min(0, robot.velocityY);
    }
}

// Helper function to get robot corners
function getRobotCorners(x, y, angle) {
    const halfSize = ROBOT_SIZE / 2;
    const corners = [
        { x: -halfSize, y: -halfSize },
        { x: halfSize, y: -halfSize },
        { x: halfSize, y: halfSize },
        { x: -halfSize, y: halfSize }
    ];
    
    // Rotate and translate corners
    return corners.map(corner => {
        const rotatedX = corner.x * Math.cos(angle) - corner.y * Math.sin(angle);
        const rotatedY = corner.x * Math.sin(angle) + corner.y * Math.cos(angle);
        return {
            x: x + rotatedX,
            y: y + rotatedY
        };
    });
}

// Helper function to check if a point is in the submersible zone
function isPointInSubmersibleZone(x, y) {
    return Math.abs(x - submersibleZone.x) < submersibleZone.width/2 &&
           Math.abs(y - submersibleZone.y) < submersibleZone.height/2;
}

// Helper function to check if a line segment intersects with the submersible zone
function lineIntersectsSubmersibleZone(point1, point2) {
    // Submersible zone boundaries
    const left = submersibleZone.x - submersibleZone.width/2;
    const right = submersibleZone.x + submersibleZone.width/2;
    const top = submersibleZone.y - submersibleZone.height/2;
    const bottom = submersibleZone.y + submersibleZone.height/2;
    
    // Check intersection with each edge of the submersible zone
    return (
        lineIntersectsLine(point1, point2, {x: left, y: top}, {x: right, y: top}) || // Top edge
        lineIntersectsLine(point1, point2, {x: right, y: top}, {x: right, y: bottom}) || // Right edge
        lineIntersectsLine(point1, point2, {x: right, y: bottom}, {x: left, y: bottom}) || // Bottom edge
        lineIntersectsLine(point1, point2, {x: left, y: bottom}, {x: left, y: top}) // Left edge
    );
}

// Helper function to check if two line segments intersect
function lineIntersectsLine(a, b, c, d) {
    // Calculate the direction vectors
    const r = {x: b.x - a.x, y: b.y - a.y};
    const s = {x: d.x - c.x, y: d.y - c.y};
    
    // Calculate the denominator
    const denominator = r.x * s.y - r.y * s.x;
    
    // If denominator is 0, lines are parallel
    if (denominator === 0) return false;
    
    // Calculate parameters for the intersection point
    const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denominator;
    const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denominator;
    
    // Check if the intersection point is within both line segments
    return (t >= 0 && t <= 1 && u >= 0 && u <= 1);
}

// Helper function to check if robot corners would collide with submersible zone
function wouldCollideWithSubmersibleZone(corners) {
    // Check existing submersible zone collision
    for (const corner of corners) {
        if (isPointInSubmersibleZone(corner.x, corner.y) || isPointInBraces(corner.x, corner.y)) {
            return true;
        }
    }
    
    // Check edges against submersible zone and braces
    for (let i = 0; i < corners.length; i++) {
        const corner1 = corners[i];
        const corner2 = corners[(i + 1) % corners.length];
        
        if (lineIntersectsSubmersibleZone(corner1, corner2) || lineIntersectsBraces(corner1, corner2)) {
            return true;
        }
    }
    
    return false;
}

function wouldCollideWithBasket(corners, basketIndex) {
    const basket = baskets[basketIndex];
    const basketCorners = getBasketCorners(basket);
    
    // Check if any robot corner is inside the basket
    for (const corner of corners) {
        if (isPointInRotatedRect(corner, basket)) {
            return true;
        }
    }
    
    // Check if any robot edge intersects with any basket edge
    for (let i = 0; i < corners.length; i++) {
        const corner1 = corners[i];
        const corner2 = corners[(i + 1) % corners.length];
        
        for (let j = 0; j < basketCorners.length; j++) {
            const basketCorner1 = basketCorners[j];
            const basketCorner2 = basketCorners[(j + 1) % basketCorners.length];
            
            if (lineIntersectsLine(corner1, corner2, basketCorner1, basketCorner2)) {
                return true;
            }
        }
    }
    
    return false;
}

function getBasketCorners(basket) {
    const halfWidth = BASKET_WIDTH / 2;
    const halfHeight = BASKET_HEIGHT / 2;
    const corners = [
        { x: -halfWidth, y: -halfHeight },
        { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight },
        { x: -halfWidth, y: halfHeight }
    ];
    
    return corners.map(corner => {
        const rotatedX = corner.x * Math.cos(basket.angle) - corner.y * Math.sin(basket.angle);
        const rotatedY = corner.x * Math.sin(basket.angle) + corner.y * Math.cos(basket.angle);
        return {
            x: basket.x + rotatedX,
            y: basket.y + rotatedY
        };
    });
}

function isPointInRotatedRect(point, rect) {
    // Translate point to origin
    const dx = point.x - rect.x;
    const dy = point.y - rect.y;
    
    // Rotate point back
    const rotatedX = dx * Math.cos(-rect.angle) - dy * Math.sin(-rect.angle);
    const rotatedY = dx * Math.sin(-rect.angle) + dy * Math.cos(-rect.angle);
    
    // Check if point is inside rectangle
    return Math.abs(rotatedX) <= BASKET_WIDTH/2 && Math.abs(rotatedY) <= BASKET_HEIGHT/2;
}

function drawField() {
    // Draw field background
    ctx.fillStyle = '#2c2824';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw field grid
    ctx.strokeStyle = '#3d3833';
    ctx.lineWidth = 1;
    
    const gridSize = 12; // 12 inch grid
    const gridPixels = gridSize * SCALE;
    
    for (let i = 0; i <= FIELD_SIZE / gridSize; i++) {
        const pos = i * gridPixels;
        
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, CANVAS_SIZE);
        ctx.stroke();
        
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(CANVAS_SIZE, pos);
        ctx.stroke();
    }
    
    // Draw field border with orange glow
    ctx.strokeStyle = '#ff7b00';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff7b00';
    ctx.shadowBlur = 15;
    ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.shadowBlur = 0; // Reset shadow for other drawings
    
    // Draw diagonal lines
    ctx.lineWidth = 4;
    
    // Draw diagonal line in top-right corner
    // Start 2 feet from right wall, end 2 feet from top wall
    const twoFeet = 2 * 12 * SCALE; // 2 feet in canvas pixels
    ctx.strokeStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE - twoFeet, 0);
    ctx.lineTo(CANVAS_SIZE, twoFeet);
    ctx.stroke();
    
    // Draw diagonal line in bottom-left corner
    // Start 2 feet from bottom wall, end 2 feet from left wall
    ctx.strokeStyle = '#3498db';
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_SIZE - twoFeet);
    ctx.lineTo(twoFeet, CANVAS_SIZE);
    ctx.stroke();
    
    // Draw human player areas in corners without baskets
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 4;
    
    // Top-left corner human player area
    const oneFoot = 12 * SCALE; // 1 foot in canvas pixels
    const twoFeetVertical = 24 * SCALE; // 2 feet vertical line
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(oneFoot, 0);
    ctx.lineTo(oneFoot, twoFeetVertical);
    ctx.stroke();
    
    // 45-degree line inward (changed from outward)
    ctx.beginPath();
    ctx.moveTo(oneFoot, twoFeetVertical);
    ctx.lineTo(0, oneFoot*3);
    ctx.stroke();

    ctx.strokeStyle = '#e74c3c';
    
    // Bottom-right corner human player area
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE - oneFoot, CANVAS_SIZE);
    ctx.lineTo(CANVAS_SIZE - oneFoot, CANVAS_SIZE - twoFeetVertical);
    ctx.stroke();
    
    // 45-degree line inward (changed from outward)
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE - oneFoot, CANVAS_SIZE - twoFeetVertical);
    ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE-oneFoot*3);
    ctx.stroke();
    
    // Draw tape lines and samples
    drawTapeLinesAndSamples();
}

// New function to draw tape lines and samples
function drawTapeLinesAndSamples() {
    // Draw tape lines for yellow samples
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = TAPE_LINE_WIDTH;
    
    [...leftSamples, ...rightSamples].forEach(sample => {
        ctx.beginPath();
        ctx.moveTo(sample.x - TAPE_LINE_LENGTH/2, sample.y);
        ctx.lineTo(sample.x + TAPE_LINE_LENGTH/2, sample.y);
        ctx.stroke();
    });

    // Draw tape lines for red samples
    ctx.strokeStyle = PIXEL_COLORS.RED;
    rightRedSamples.forEach(sample => {
        ctx.beginPath();
        ctx.moveTo(sample.x - TAPE_LINE_LENGTH/2, sample.y);
        ctx.lineTo(sample.x + TAPE_LINE_LENGTH/2, sample.y);
        ctx.stroke();
    });

    // Draw tape lines for blue samples
    ctx.strokeStyle = PIXEL_COLORS.BLUE;
    leftBlueSamples.forEach(sample => {
        ctx.beginPath();
        ctx.moveTo(sample.x - TAPE_LINE_LENGTH/2, sample.y);
        ctx.lineTo(sample.x + TAPE_LINE_LENGTH/2, sample.y);
        ctx.stroke();
    });
}

function drawSubmersibleZone() {
    // Draw existing submersible zone
    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.fillRect(
        submersibleZone.x - submersibleZone.width/2,
        submersibleZone.y - submersibleZone.height/2,
        submersibleZone.width,
        submersibleZone.height
    );
    
    // Draw submersible zone border
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 4;
    ctx.strokeRect(
        submersibleZone.x - submersibleZone.width/2,
        submersibleZone.y - submersibleZone.height/2,
        submersibleZone.width,
        submersibleZone.height
    );
    
    // Draw braces
    const zoneLeft = submersibleZone.x - submersibleZone.width/2;
    const zoneRight = submersibleZone.x + submersibleZone.width/2;
    const zoneTop = submersibleZone.y - submersibleZone.height/2;
    const zoneBottom = submersibleZone.y + submersibleZone.height/2;
    
    ctx.fillStyle = '#cccccc';
    
    // Draw top braces (parallel to short sides)
    ctx.fillRect(
        zoneLeft - submersibleZone.braceWidth/2,
        zoneTop - submersibleZone.braceLength,
        submersibleZone.braceWidth,
        submersibleZone.braceLength
    );
    ctx.fillRect(
        zoneRight - submersibleZone.braceWidth/2,
        zoneTop - submersibleZone.braceLength,
        submersibleZone.braceWidth,
        submersibleZone.braceLength
    );
    
    // Draw bottom braces (parallel to short sides)
    ctx.fillRect(
        zoneLeft - submersibleZone.braceWidth/2,
        zoneBottom,
        submersibleZone.braceWidth,
        submersibleZone.braceLength
    );
    ctx.fillRect(
        zoneRight - submersibleZone.braceWidth/2,
        zoneBottom,
        submersibleZone.braceWidth,
        submersibleZone.braceLength
    );
}

function drawPixels() {
    // Draw active pixels in submersible zone
    pixels.forEach(pixel => {
        if (!pixel.active) return;
        
        // Draw pixel with its specific rotation
        ctx.fillStyle = pixel.color;
        ctx.save();
        ctx.translate(pixel.x, pixel.y);
        ctx.rotate(pixel.rotation);
        ctx.fillRect(-PIXEL_WIDTH/2, -PIXEL_HEIGHT/2, PIXEL_WIDTH, PIXEL_HEIGHT);
        ctx.restore();
    });
    
    // Draw dropped pixels on the floor
    droppedPixels.forEach(pixel => {
        ctx.fillStyle = pixel.color;
        ctx.save();
        ctx.translate(pixel.x, pixel.y);
        ctx.rotate(pixel.rotation);
        ctx.fillRect(-PIXEL_WIDTH/2, -PIXEL_HEIGHT/2, PIXEL_WIDTH, PIXEL_HEIGHT);
        ctx.restore();
    });
}

function drawBaskets() {
    baskets.forEach((basket, index) => {
        ctx.save();
        ctx.translate(basket.x, basket.y);
        ctx.rotate(basket.angle);
        
        // Draw basket with rounded corners
        const cornerRadius = BASKET_WIDTH * 0.1; // 10% of basket width for rounded corners
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-BASKET_WIDTH/2 + cornerRadius, -BASKET_HEIGHT/2);
        // Top edge and top-right corner
        ctx.lineTo(BASKET_WIDTH/2 - cornerRadius, -BASKET_HEIGHT/2);
        ctx.arcTo(BASKET_WIDTH/2, -BASKET_HEIGHT/2, BASKET_WIDTH/2, -BASKET_HEIGHT/2 + cornerRadius, cornerRadius);
        // Right edge and bottom-right corner
        ctx.lineTo(BASKET_WIDTH/2, BASKET_HEIGHT/2 - cornerRadius);
        ctx.arcTo(BASKET_WIDTH/2, BASKET_HEIGHT/2, BASKET_WIDTH/2 - cornerRadius, BASKET_HEIGHT/2, cornerRadius);
        // Bottom edge and bottom-left corner
        ctx.lineTo(-BASKET_WIDTH/2 + cornerRadius, BASKET_HEIGHT/2);
        ctx.arcTo(-BASKET_WIDTH/2, BASKET_HEIGHT/2, -BASKET_WIDTH/2, BASKET_HEIGHT/2 - cornerRadius, cornerRadius);
        // Left edge and top-left corner
        ctx.lineTo(-BASKET_WIDTH/2, -BASKET_HEIGHT/2 + cornerRadius);
        ctx.arcTo(-BASKET_WIDTH/2, -BASKET_HEIGHT/2, -BASKET_WIDTH/2 + cornerRadius, -BASKET_HEIGHT/2, cornerRadius);
        ctx.closePath();
        ctx.fill();
        
        // Draw basket border with rounded corners
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw stacked pixels in the basket
        const stackedPixels = basketPixels[index];
        stackedPixels.forEach(pixel => {
            ctx.save();
            ctx.translate(pixel.x, pixel.y);
            ctx.rotate(pixel.rotation);
            ctx.fillStyle = pixel.color;
            ctx.fillRect(-PIXEL_WIDTH/2, -PIXEL_HEIGHT/2, PIXEL_WIDTH, PIXEL_HEIGHT);
            ctx.restore();
        });
        
        ctx.restore();
    });
}

function drawRobot() {
    ctx.save();
    ctx.translate(robot.x, robot.y);
    ctx.rotate(robot.angle);
    
    // Robot body with rounded corners
    const cornerRadius = ROBOT_SIZE * 0.15; // 15% of robot size for rounded corners
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(-ROBOT_SIZE/2 + cornerRadius, -ROBOT_SIZE/2);
    // Top edge and top-right corner
    ctx.lineTo(ROBOT_SIZE/2 - cornerRadius, -ROBOT_SIZE/2);
    ctx.arcTo(ROBOT_SIZE/2, -ROBOT_SIZE/2, ROBOT_SIZE/2, -ROBOT_SIZE/2 + cornerRadius, cornerRadius);
    // Right edge and bottom-right corner
    ctx.lineTo(ROBOT_SIZE/2, ROBOT_SIZE/2 - cornerRadius);
    ctx.arcTo(ROBOT_SIZE/2, ROBOT_SIZE/2, ROBOT_SIZE/2 - cornerRadius, ROBOT_SIZE/2, cornerRadius);
    // Bottom edge and bottom-left corner
    ctx.lineTo(-ROBOT_SIZE/2 + cornerRadius, ROBOT_SIZE/2);
    ctx.arcTo(-ROBOT_SIZE/2, ROBOT_SIZE/2, -ROBOT_SIZE/2, ROBOT_SIZE/2 - cornerRadius, cornerRadius);
    // Left edge and top-left corner
    ctx.lineTo(-ROBOT_SIZE/2, -ROBOT_SIZE/2 + cornerRadius);
    ctx.arcTo(-ROBOT_SIZE/2, -ROBOT_SIZE/2, -ROBOT_SIZE/2 + cornerRadius, -ROBOT_SIZE/2, cornerRadius);
    ctx.closePath();
    ctx.fill();
    
    // LED strip indicator around the robot border
    if (robot.hasPixel) {
        // Set color based on pixel state
        let stripColor = robot.pixelPosition === 'front' ? '#00ff00' : robot.pixelColor;
        let glowOpacity = robot.pixelPosition === 'front' ? 0.8 : 0.4;
        
        ctx.save();
        
        // Create a shadow for the glow effect
        ctx.shadowColor = stripColor;
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw outer glow (multiple layers for intensity)
        for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = stripColor.replace(')', `, ${glowOpacity * 0.3})`).replace('rgb', 'rgba');
            ctx.lineWidth = 8 - i * 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Draw the glowing border following the robot's shape
            ctx.beginPath();
            ctx.moveTo(-ROBOT_SIZE/2 + cornerRadius, -ROBOT_SIZE/2);
            // Top edge and top-right corner
            ctx.lineTo(ROBOT_SIZE/2 - cornerRadius, -ROBOT_SIZE/2);
            ctx.arcTo(ROBOT_SIZE/2, -ROBOT_SIZE/2, ROBOT_SIZE/2, -ROBOT_SIZE/2 + cornerRadius, cornerRadius);
            // Right edge and bottom-right corner
            ctx.lineTo(ROBOT_SIZE/2, ROBOT_SIZE/2 - cornerRadius);
            ctx.arcTo(ROBOT_SIZE/2, ROBOT_SIZE/2, ROBOT_SIZE/2 - cornerRadius, ROBOT_SIZE/2, cornerRadius);
            // Bottom edge and bottom-left corner
            ctx.lineTo(-ROBOT_SIZE/2 + cornerRadius, ROBOT_SIZE/2);
            ctx.arcTo(-ROBOT_SIZE/2, ROBOT_SIZE/2, -ROBOT_SIZE/2, ROBOT_SIZE/2 - cornerRadius, cornerRadius);
            // Left edge and top-left corner
            ctx.lineTo(-ROBOT_SIZE/2, -ROBOT_SIZE/2 + cornerRadius);
            ctx.arcTo(-ROBOT_SIZE/2, -ROBOT_SIZE/2, -ROBOT_SIZE/2 + cornerRadius, -ROBOT_SIZE/2, cornerRadius);
            ctx.closePath();
            ctx.stroke();
        }
        
        // Remove shadow for the main strip
        ctx.shadowBlur = 0;
        
        // Draw main bright strip
        ctx.strokeStyle = stripColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
    
    ctx.restore();
    
    // Draw outtake extension and pixel if robot has one at the front
    if (robot.hasPixel && (robot.pixelPosition === 'front' || robot.pixelPosition === 'transferring')) {
        ctx.save();
        ctx.translate(robot.x, robot.y);
        ctx.rotate(robot.angle);
        
        // Draw outtake extension with fixed thickness
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 3;
        
        if (robot.pixelPosition === 'transferring') {
            // Calculate transfer position
            const progress = robot.transferProgress;
            // Use easeInOutCubic for smooth animation
            const t = progress < 0.5 ? 4 * progress * progress * progress : 
                1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            // Calculate current extension length
            const currentLength = ROBOT_SIZE/2 + (OUTTAKE_LENGTH * Math.pow(t, 0.7));
            
            // Draw extending line
            ctx.beginPath();
            ctx.moveTo(ROBOT_SIZE/2, 0);
            ctx.lineTo(currentLength, 0);
            ctx.stroke();
            
            // Draw outtake mechanism at end of line
            ctx.fillStyle = '#7f8c8d';
            ctx.beginPath();
            ctx.arc(currentLength, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw pixel at the end of the line
            ctx.fillStyle = robot.pixelColor;
            ctx.save();
            ctx.translate(currentLength, 0);
            ctx.rotate(Math.PI/2); // Keep consistent orientation throughout
            ctx.fillRect(-PIXEL_WIDTH/2, -PIXEL_HEIGHT/2, PIXEL_WIDTH, PIXEL_HEIGHT);
            ctx.restore();
        } else if (robot.pixelPosition === 'front') {
            // Draw full extension
            ctx.beginPath();
            ctx.moveTo(ROBOT_SIZE/2, 0);
            ctx.lineTo(ROBOT_SIZE/2 + OUTTAKE_LENGTH, 0);
            ctx.stroke();
            
            // Draw outtake mechanism
            ctx.fillStyle = '#7f8c8d';
            ctx.beginPath();
            ctx.arc(ROBOT_SIZE/2 + OUTTAKE_LENGTH, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw pixel at the end of outtake
            ctx.fillStyle = robot.pixelColor;
            ctx.save();
            ctx.translate(ROBOT_SIZE/2 + OUTTAKE_LENGTH, 0);
            ctx.rotate(Math.PI/2);
            ctx.fillRect(-PIXEL_WIDTH/2, -PIXEL_HEIGHT/2, PIXEL_WIDTH, PIXEL_HEIGHT);
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    // Draw linear slides (both collapsed and extended)
    ctx.save();
    ctx.translate(robot.x, robot.y);
    
    // Draw collapsed slides on robot at all times
    const slideOffset = ROBOT_SIZE * 0.3; // Offset slides from center by 30% of robot size
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 4;
    
    // Draw left collapsed slide
    ctx.beginPath();
    ctx.moveTo(
        Math.cos(robot.angle + Math.PI/2) * slideOffset,
        Math.sin(robot.angle + Math.PI/2) * slideOffset
    );
    ctx.lineTo(
        Math.cos(robot.angle + Math.PI) * ROBOT_SIZE/2 + Math.cos(robot.angle + Math.PI/2) * slideOffset,
        Math.sin(robot.angle + Math.PI) * ROBOT_SIZE/2 + Math.sin(robot.angle + Math.PI/2) * slideOffset
    );
    ctx.stroke();
    
    // Draw right collapsed slide
    ctx.beginPath();
    ctx.moveTo(
        Math.cos(robot.angle - Math.PI/2) * slideOffset,
        Math.sin(robot.angle - Math.PI/2) * slideOffset
    );
    ctx.lineTo(
        Math.cos(robot.angle + Math.PI) * ROBOT_SIZE/2 + Math.cos(robot.angle - Math.PI/2) * slideOffset,
        Math.sin(robot.angle + Math.PI) * ROBOT_SIZE/2 + Math.sin(robot.angle - Math.PI/2) * slideOffset
    );
    ctx.stroke();
    
    // Draw collapsed crossbar
    ctx.beginPath();
    ctx.moveTo(
        Math.cos(robot.angle + Math.PI) * ROBOT_SIZE/2 + Math.cos(robot.angle + Math.PI/2) * slideOffset,
        Math.sin(robot.angle + Math.PI) * ROBOT_SIZE/2 + Math.sin(robot.angle + Math.PI/2) * slideOffset
    );
    ctx.lineTo(
        Math.cos(robot.angle + Math.PI) * ROBOT_SIZE/2 + Math.cos(robot.angle - Math.PI/2) * slideOffset,
        Math.sin(robot.angle + Math.PI) * ROBOT_SIZE/2 + Math.sin(robot.angle - Math.PI/2) * slideOffset
    );
    ctx.stroke();
    
    // Draw extended slides if extending or extended
    if (robot.slideExtension > 0) {
        // Calculate current slide length based on animation
        const currentSlideLength = LINEAR_SLIDE_LENGTH * robot.slideExtension;
        
        // Draw left extended slide
        ctx.beginPath();
        ctx.moveTo(
            Math.cos(robot.slideAngle + Math.PI/2) * slideOffset,
            Math.sin(robot.slideAngle + Math.PI/2) * slideOffset
        );
        ctx.lineTo(
            Math.cos(robot.slideAngle) * currentSlideLength + Math.cos(robot.slideAngle + Math.PI/2) * slideOffset,
            Math.sin(robot.slideAngle) * currentSlideLength + Math.sin(robot.slideAngle + Math.PI/2) * slideOffset
        );
        ctx.stroke();
        
        // Draw right extended slide
        ctx.beginPath();
        ctx.moveTo(
            Math.cos(robot.slideAngle - Math.PI/2) * slideOffset,
            Math.sin(robot.slideAngle - Math.PI/2) * slideOffset
        );
        ctx.lineTo(
            Math.cos(robot.slideAngle) * currentSlideLength + Math.cos(robot.slideAngle - Math.PI/2) * slideOffset,
            Math.sin(robot.slideAngle) * currentSlideLength + Math.sin(robot.slideAngle - Math.PI/2) * slideOffset
        );
        ctx.stroke();
        
        // Draw crossbar at end of extended slides
        ctx.beginPath();
        ctx.moveTo(
            Math.cos(robot.slideAngle) * currentSlideLength + Math.cos(robot.slideAngle + Math.PI/2) * slideOffset,
            Math.sin(robot.slideAngle) * currentSlideLength + Math.sin(robot.slideAngle + Math.PI/2) * slideOffset
        );
        ctx.lineTo(
            Math.cos(robot.slideAngle) * currentSlideLength + Math.cos(robot.slideAngle - Math.PI/2) * slideOffset,
            Math.sin(robot.slideAngle) * currentSlideLength + Math.sin(robot.slideAngle - Math.PI/2) * slideOffset
        );
        ctx.stroke();
        
        // Calculate end point (center between the two slides)
        const slideEndX = Math.cos(robot.slideAngle) * currentSlideLength;
        const slideEndY = Math.sin(robot.slideAngle) * currentSlideLength;
        
        // Draw intake mechanism at end of slides
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.arc(slideEndX, slideEndY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw intake range indicator (semi-transparent)
        ctx.fillStyle = 'rgba(127, 140, 141, 0.2)';
        ctx.beginPath();
        ctx.arc(slideEndX, slideEndY, INTAKE_RANGE, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw pixel if robot has one on the slides
        if (robot.hasPixel && robot.pixelPosition === 'slides') {
            ctx.fillStyle = robot.pixelColor;
            ctx.save();
            ctx.translate(slideEndX, slideEndY);
            ctx.rotate(Math.PI/4);
            ctx.fillRect(-PIXEL_WIDTH/2, -PIXEL_HEIGHT/2, PIXEL_WIDTH, PIXEL_HEIGHT);
            ctx.restore();
        }
    }
    
    ctx.restore();
}

function gameLoop() {
    // Update
    updateRobot();
    
    // Update period display
    const periodElement = document.getElementById('period');
    if (periodElement) {
        let periodText = 'Not Started';
        if (gamePeriod === 'autonomous') {
            const timeLeft = Math.ceil((autonomousEndTime - Date.now()) / 1000);
            periodText = `Autonomous (${timeLeft}s)`;
        } else if (gamePeriod === 'teleop') {
            const timeLeft = Math.ceil((gameStartTime + AUTONOMOUS_PERIOD + TELEOP_PERIOD - Date.now()) / 1000);
            periodText = `TeleOp (${timeLeft}s)`;
        } else if (gamePeriod === 'ended') {
            periodText = 'Match Complete';
        }
        periodElement.textContent = periodText;
    }
    
    // Draw
    drawField();
    drawSubmersibleZone();
    drawPixels();
    drawBaskets();
    drawRobot();
    
    // Continue loop
    requestAnimationFrame(gameLoop);
}

// Initialize and start the game
document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Could not find game canvas');
        return;
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context');
        return;
    }
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // Setup sensitivity slider
    const sensitivitySlider = document.getElementById('sensitivity');
    const sensitivityValue = document.getElementById('sensitivityValue');
    
    if (sensitivitySlider && sensitivityValue) {
        sensitivitySlider.addEventListener('input', (e) => {
            STEERING_SENSITIVITY = parseFloat(e.target.value);
            sensitivityValue.textContent = STEERING_SENSITIVITY.toFixed(1);
            // Update dependent constants
            MAX_ANGULAR_SPEED = Math.PI * STEERING_SENSITIVITY;
            ANGULAR_ACCELERATION = MAX_ANGULAR_SPEED * 6;
            ANGULAR_DECELERATION = MAX_ANGULAR_SPEED * 3;
        });
    }

    // Initialize game
    generatePixels();
    
    // Add yellow samples to droppedPixels array
    leftSamples.forEach(sample => {
        droppedPixels.push({
            x: sample.x,
            y: sample.y,
            rotation: Math.PI/2, // 90 degrees rotation
            color: PIXEL_COLORS.YELLOW
        });
    });
    
    rightSamples.forEach(sample => {
        droppedPixels.push({
            x: sample.x,
            y: sample.y,
            rotation: Math.PI/2, // 90 degrees rotation
            color: PIXEL_COLORS.YELLOW
        });
    });

    // Add red samples to droppedPixels array (now on right side)
    rightRedSamples.forEach(sample => {
        droppedPixels.push({
            x: sample.x,
            y: sample.y,
            rotation: Math.PI/2, // 90 degrees rotation
            color: PIXEL_COLORS.RED
        });
    });
    
    // Add blue samples to droppedPixels array (now on left side)
    leftBlueSamples.forEach(sample => {
        droppedPixels.push({
            x: sample.x,
            y: sample.y,
            rotation: Math.PI/2, // 90 degrees rotation
            color: PIXEL_COLORS.BLUE
        });
    });
    
    // Start game loop
    gameLoop();
});

// Helper function to check if a pixel is colliding with the robot
function isPixelCollidingWithRobot(pixel, robotCorners) {
    // Create a rectangle for the pixel based on its position and rotation
    const pixelCorners = [
        {x: -PIXEL_WIDTH/2, y: -PIXEL_HEIGHT/2},
        {x: PIXEL_WIDTH/2, y: -PIXEL_HEIGHT/2},
        {x: PIXEL_WIDTH/2, y: PIXEL_HEIGHT/2},
        {x: -PIXEL_WIDTH/2, y: PIXEL_HEIGHT/2}
    ].map(corner => {
        const rotatedX = corner.x * Math.cos(pixel.rotation) - corner.y * Math.sin(pixel.rotation);
        const rotatedY = corner.x * Math.sin(pixel.rotation) + corner.y * Math.cos(pixel.rotation);
        return {
            x: pixel.x + rotatedX,
            y: pixel.y + rotatedY
        };
    });
    
    // Check for collision between the two rectangles using the Separating Axis Theorem
    return !findSeparatingAxis(robotCorners, pixelCorners) && !findSeparatingAxis(pixelCorners, robotCorners);
}

// Helper function for the Separating Axis Theorem
function findSeparatingAxis(corners1, corners2) {
    for (let i = 0; i < corners1.length; i++) {
        const j = (i + 1) % corners1.length;
        const edge = {
            x: corners1[j].x - corners1[i].x,
            y: corners1[j].y - corners1[i].y
        };
        const axis = {x: -edge.y, y: edge.x}; // Normal to the edge
        
        // Project both shapes onto the axis
        const proj1 = projectShapeOntoAxis(corners1, axis);
        const proj2 = projectShapeOntoAxis(corners2, axis);
        
        // If projections don't overlap, we found a separating axis
        if (proj1.max < proj2.min || proj2.max < proj1.min) {
            return true;
        }
    }
    return false;
}

// Helper function to project a shape onto an axis
function projectShapeOntoAxis(corners, axis) {
    let min = Infinity;
    let max = -Infinity;
    
    corners.forEach(corner => {
        const projection = (corner.x * axis.x + corner.y * axis.y) / 
            Math.sqrt(axis.x * axis.x + axis.y * axis.y);
        min = Math.min(min, projection);
        max = Math.max(max, projection);
    });
    
    return {min, max};
}

// Helper function to check if a point is in any of the submersible braces
function isPointInBraces(x, y) {
    const zoneLeft = submersibleZone.x - submersibleZone.width/2;
    const zoneRight = submersibleZone.x + submersibleZone.width/2;
    const zoneTop = submersibleZone.y - submersibleZone.height/2;
    const zoneBottom = submersibleZone.y + submersibleZone.height/2;
    
    // Check top braces
    if (y >= zoneTop - submersibleZone.braceLength && y <= zoneTop) {
        if ((x >= zoneLeft - submersibleZone.braceWidth/2 && x <= zoneLeft + submersibleZone.braceWidth/2) ||
            (x >= zoneRight - submersibleZone.braceWidth/2 && x <= zoneRight + submersibleZone.braceWidth/2)) {
            return true;
        }
    }
    
    // Check bottom braces
    if (y >= zoneBottom && y <= zoneBottom + submersibleZone.braceLength) {
        if ((x >= zoneLeft - submersibleZone.braceWidth/2 && x <= zoneLeft + submersibleZone.braceWidth/2) ||
            (x >= zoneRight - submersibleZone.braceWidth/2 && x <= zoneRight + submersibleZone.braceWidth/2)) {
            return true;
        }
    }
    
    return false;
}

// Add function to check line intersection with braces
function lineIntersectsBraces(point1, point2) {
    const zoneLeft = submersibleZone.x - submersibleZone.width/2;
    const zoneRight = submersibleZone.x + submersibleZone.width/2;
    const zoneTop = submersibleZone.y - submersibleZone.height/2;
    const zoneBottom = submersibleZone.y + submersibleZone.height/2;
    
    // Define brace rectangles
    const braces = [
        // Top left brace
        {
            x1: zoneLeft - submersibleZone.braceWidth/2,
            y1: zoneTop - submersibleZone.braceLength,
            x2: zoneLeft + submersibleZone.braceWidth/2,
            y2: zoneTop
        },
        // Top right brace
        {
            x1: zoneRight - submersibleZone.braceWidth/2,
            y1: zoneTop - submersibleZone.braceLength,
            x2: zoneRight + submersibleZone.braceWidth/2,
            y2: zoneTop
        },
        // Bottom left brace
        {
            x1: zoneLeft - submersibleZone.braceWidth/2,
            y1: zoneBottom,
            x2: zoneLeft + submersibleZone.braceWidth/2,
            y2: zoneBottom + submersibleZone.braceLength
        },
        // Bottom right brace
        {
            x1: zoneRight - submersibleZone.braceWidth/2,
            y1: zoneBottom,
            x2: zoneRight + submersibleZone.braceWidth/2,
            y2: zoneBottom + submersibleZone.braceLength
        }
    ];
    
    // Check intersection with each brace
    for (const brace of braces) {
        // Check if line intersects with brace rectangle
        if (lineIntersectsRect(point1, point2, brace)) {
            return true;
        }
    }
    
    return false;
}

// Helper function to check if a line intersects with a rectangle
function lineIntersectsRect(lineStart, lineEnd, rect) {
    // Check if either endpoint is inside the rectangle
    if (isPointInRect(lineStart, rect) || isPointInRect(lineEnd, rect)) {
        return true;
    }
    
    // Check intersection with all four sides of the rectangle
    const rectLines = [
        {start: {x: rect.x1, y: rect.y1}, end: {x: rect.x2, y: rect.y1}}, // Top
        {start: {x: rect.x2, y: rect.y1}, end: {x: rect.x2, y: rect.y2}}, // Right
        {start: {x: rect.x2, y: rect.y2}, end: {x: rect.x1, y: rect.y2}}, // Bottom
        {start: {x: rect.x1, y: rect.y2}, end: {x: rect.x1, y: rect.y1}}  // Left
    ];
    
    for (const rectLine of rectLines) {
        if (lineIntersectsLine(lineStart, lineEnd, rectLine.start, rectLine.end)) {
            return true;
        }
    }
    
    return false;
}

// Helper function to check if a point is inside a rectangle
function isPointInRect(point, rect) {
    return point.x >= rect.x1 && point.x <= rect.x2 &&
           point.y >= rect.y1 && point.y <= rect.y2;
}

// Function to start the game periods
function startGame() {
    if (gameStartTime === null) {
        gameStartTime = Date.now();
        autonomousEndTime = gameStartTime + AUTONOMOUS_PERIOD;
        gamePeriod = 'autonomous';
        gameActive = true;
        
        // Set up period transitions
        setTimeout(() => {
            // End of autonomous
            gamePeriod = 'teleop';
            // Score autonomous points again
            autonomousScoring.forEach(points => {
                score += points;
                document.getElementById('score').textContent = score;
            });
        }, AUTONOMOUS_PERIOD);

        setTimeout(() => {
            // End of teleop
            gamePeriod = 'ended';
            gameActive = false;
        }, AUTONOMOUS_PERIOD + TELEOP_PERIOD);
    }
}