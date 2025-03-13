// Matter.js module aliases
const Engine = Matter.Engine;
const Render = Matter.Render;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Events = Matter.Events;
const Vector = Matter.Vector;
const Runner = Matter.Runner;

// Game variables
let engine;
let render;
let runner;
let world;
let gameContainer;
let currentLevel = 1;
let player;
let target;
let walls = [];
let hazards = [];
let levelCompleteMessage;
let gameOverMessage;
let startScreen;
let gamePaused = false;
let gameOver = false;
let gameStarted = false;
let levelStartTime = 0;

// Sound effects
let soundTarget;
let soundHazard;
let soundReverse;
let soundSpeedup;

// Player movement settings
const playerForce = 0.01;
const playerRadius = 20;
const targetRadius = 30;

// Hazard settings
const hazardRadius = 15;
const initialHazardSpeed = 4;
const hazardSpeedMultiplier = 1.8; // Reduced multiplier to prevent extreme speeds
const maxHazardSpeed = 40; // Maximum speed cap for hazards
let currentHazardSpeed = initialHazardSpeed;

// Safety distances
const MIN_PLAYER_TARGET_DISTANCE = 250; // Minimum distance between player and target
const MIN_PLAYER_HAZARD_DISTANCE = 600; // Minimum distance between player and hazards
const MIN_TARGET_HAZARD_DISTANCE = 200; // Minimum distance between target and hazards
const MIN_HAZARD_HAZARD_DISTANCE = 100; // Minimum distance between hazards

// Initialize the game
function init() {
    // Get DOM elements
    gameContainer = document.getElementById('game-canvas-container');
    levelCompleteMessage = document.getElementById('level-complete');
    gameOverMessage = document.getElementById('game-over');
    startScreen = document.getElementById('start-screen');
    
    // Get sound elements
    soundTarget = document.getElementById('sound-target');
    soundHazard = document.getElementById('sound-hazard');
    soundReverse = document.getElementById('sound-reverse');
    soundSpeedup = document.getElementById('sound-speedup');
    
    // Set up start button
    document.getElementById('start-button').addEventListener('click', startGame);
    
    // Set up keyboard controls
    setupKeyboardControls();
    
    // Show start screen
    startScreen.classList.remove('hidden');
    
    // Prevent scrolling when arrow keys are pressed
    window.addEventListener('keydown', function(e) {
        // Arrow keys and space bar
        if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
            e.preventDefault();
        }
    }, false);
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Add CSS for target glow animation
    addTargetGlowStyles();
}

// Start the game
function startGame() {
    // Hide start screen
    startScreen.classList.add('hidden');
    
    // Reset game state
    currentLevel = 1;
    document.getElementById('level-counter').textContent = `Level: ${currentLevel}`;
    
    // Get the container dimensions
    const width = gameContainer.clientWidth;
    const height = gameContainer.clientHeight;

    // Create engine with improved settings
    engine = Engine.create({
        positionIterations: 10, // Increase position iterations for better collision detection
        velocityIterations: 10  // Increase velocity iterations for better collision resolution
    });
    world = engine.world;
    
    // Create runner (separate from engine)
    runner = Runner.create();
    
    // Disable gravity
    engine.world.gravity.y = 0;

    // Create renderer
    render = Render.create({
        element: gameContainer,
        engine: engine,
        options: {
            width: width,
            height: height,
            wireframes: false,
            background: 'transparent',
            showAngleIndicator: false
        }
    });

    // Create walls (boundaries)
    createWalls(width, height);
    
    // Create player
    createPlayer(width, height);
    
    // Create target
    createTarget(width, height);
    
    // Create initial hazard
    createHazards(width, height, currentLevel);

    // Set up collision detection
    setupCollisions();

    // Run the engine with our custom runner
    Runner.run(runner, engine);

    // Run the renderer
    Render.run(render);

    // Start the game loop
    requestAnimationFrame(gameLoop);
    
    // Set game as started
    gameStarted = true;
    gameOver = false;
    
    // Record level start time
    levelStartTime = Date.now();
    
    // Log initialization
    console.log('Game initialized');
}

// Create walls
function createWalls(width, height) {
    const wallOptions = {
        isStatic: true,
        render: {
            fillStyle: 'rgba(255, 255, 255, 0.2)',
            strokeStyle: 'rgba(255, 255, 255, 0.5)',
            lineWidth: 1
        },
        label: 'wall',
        restitution: 1, // Perfect elasticity for bounces
        friction: 0,    // No friction to maintain momentum
        collisionFilter: {
            category: 0x0001, // Category for walls
            mask: 0x0003      // Collide with player (0x0001) and hazards (0x0002)
        }
    };

    // Wall thickness - increased for better collision
    const wallThickness = 50;

    // Create walls
    walls = [
        // Top wall
        Bodies.rectangle(width / 2, -wallThickness / 2, width + wallThickness, wallThickness, wallOptions),
        // Bottom wall
        Bodies.rectangle(width / 2, height + wallThickness / 2, width + wallThickness, wallThickness, wallOptions),
        // Left wall
        Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height + wallThickness, wallOptions),
        // Right wall
        Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height + wallThickness, wallOptions)
    ];

    // Add walls to the world
    World.add(world, walls);
}

// Create player
function createPlayer(width, height) {
    player = Bodies.circle(width / 2, height / 2, playerRadius, {
        restitution: 0.8,
        friction: 0.05,
        density: 0.001,
        frictionAir: 0.01,
        render: {
            fillStyle: '#4da6ff',
            strokeStyle: '#2a7fff',
            lineWidth: 4
        },
        label: 'player',
        collisionFilter: {
            category: 0x0001, // Category for player
            mask: 0x0007     // Collide with walls (0x0001), hazards (0x0002), and target (0x0004)
        }
    });
    
    World.add(world, player);
    
    // Add breathing animation to player
    //addPlayerBreathingEffect();
    
    // Initialize trail array
    player.trail = [];
    player.lastTrailTime = 0;
}

// Add breathing effect to player
function addPlayerBreathingEffect() {
    // Create a breathing animation for the player
    const breathingAnimation = document.createElement('div');
    breathingAnimation.className = 'player-breathing';
    breathingAnimation.style.position = 'absolute';
    breathingAnimation.style.left = `${player.position.x - playerRadius * 1.2}px`;
    breathingAnimation.style.top = `${player.position.y - playerRadius * 1.2}px`;
    breathingAnimation.style.width = `${playerRadius * 2.4}px`;
    breathingAnimation.style.height = `${playerRadius * 2.4}px`;
    breathingAnimation.style.borderRadius = '50%';
    breathingAnimation.style.backgroundColor = 'transparent';
    breathingAnimation.style.border = '2px solid rgba(77, 166, 255, 0.6)';
    breathingAnimation.style.boxShadow = '0 0 10px 5px rgba(77, 166, 255, 0.4)';
    breathingAnimation.style.zIndex = '4';
    breathingAnimation.style.pointerEvents = 'none';
    breathingAnimation.style.animation = 'playerBreathing 1.5s infinite alternate ease-in-out';
    
    // Add the breathing element to the game container
    gameContainer.appendChild(breathingAnimation);
    
    // Store reference to the breathing element on the player for later updates
    player.breathingElement = breathingAnimation;
}

// Create target
function createTarget(width, height) {
    // Random position for target (away from player)
    const position = getSafePosition(width, height, MIN_PLAYER_TARGET_DISTANCE, [player]);
    
    target = Bodies.circle(position.x, position.y, targetRadius, {
        isStatic: true,
        isSensor: true, // Changed back to true for player collision
        restitution: 1, // Perfect elasticity for bounces
        render: {
            fillStyle: '#66ff66',
            strokeStyle: '#33cc33',
            lineWidth: 1  // Reduced from 2 to 1 for thinner border
        },
        label: 'target',
        collisionFilter: {
            category: 0x0004, // Category for target
            mask: 0x0003     // Collide with player (0x0001) and hazards (0x0002)
        }
    });
    
    World.add(world, target);
    
    // Add glowing effect to the target
    addTargetGlow(position.x, position.y);
}

// Add glowing effect to the target
function addTargetGlow(x, y) {
    // Create a glowing div element
    const glow = document.createElement('div');
    glow.className = 'target-glow';
    glow.style.position = 'absolute';
    glow.style.left = `${x - targetRadius * 1.2}px`;  // Reduced from 1.5 to 1.2 to bring glow closer
    glow.style.top = `${y - targetRadius * 1.2}px`;   // Reduced from 1.5 to 1.2 to bring glow closer
    glow.style.width = `${targetRadius * 2.4}px`;     // Reduced from 3 to 2.4 to match new position
    glow.style.height = `${targetRadius * 2.4}px`;    // Reduced from 3 to 2.4 to match new position
    glow.style.borderRadius = '50%';
    glow.style.backgroundColor = 'rgba(102, 255, 102, 0.1)'; // Added slight background color
    glow.style.boxShadow = '0 0 20px 15px rgba(102, 255, 102, 0.7), inset 0 0 10px 5px rgba(102, 255, 102, 0.5)'; // Added inner glow
    glow.style.zIndex = '5';
    glow.style.pointerEvents = 'none'; // Make sure it doesn't interfere with clicks
    glow.style.animation = 'targetGlow 2s infinite alternate';
    
    // Add the glow element to the game container
    gameContainer.appendChild(glow);
    
    // Store reference to the glow element on the target for later removal
    target.glowElement = glow;
}

// Create hazard balls
function createHazards(width, height, count) {
    // Clear existing hazards
    hazards.forEach(hazard => World.remove(world, hazard));
    hazards = [];
    
    // Reset hazard speed
    currentHazardSpeed = initialHazardSpeed;
    
    // Create new hazards based on level
    for (let i = 0; i < count; i++) {
        // For each hazard, we need to ensure it's away from player and other hazards
        createSingleHazard(width, height);
    }
    
    // Log the number of hazards created
    console.log(`Created ${hazards.length} hazards for level ${currentLevel}`);
}

// Create a single hazard at a safe distance from player and other hazards
function createSingleHazard(width, height) {
    // Objects to avoid: player, target, and existing hazards
    const objectsToAvoid = [player, target, ...hazards];
    
    // Try to find a position that's far from player (using the MIN_PLAYER_HAZARD_DISTANCE)
    const position = getSafePosition(width, height, MIN_PLAYER_HAZARD_DISTANCE, objectsToAvoid);
    
    // Get a random disco color that's not the target color or player color
    const hazardColor = getRandomDiscoColor();
    
    // Create the hazard
    const hazard = Bodies.circle(position.x, position.y, hazardRadius, {
        restitution: 1,
        friction: 0,
        frictionAir: 0,
        density: 0.001, // Lower density for better collision handling
        render: {
            fillStyle: hazardColor,
            strokeStyle: getDarkerColor(hazardColor),
            lineWidth: 2
        },
        label: 'hazard',
        collisionFilter: {
            category: 0x0002, // Category for hazards
            mask: 0x0007     // Collide with walls, player, other hazards, and target (0x0001 | 0x0002 | 0x0004)
        }
    });
    
    // Add to world
    World.add(world, hazard);
    hazards.push(hazard);
    
    // Set initial velocity
    const angle = Math.random() * Math.PI * 2;
    Body.setVelocity(hazard, {
        x: Math.cos(angle) * currentHazardSpeed,
        y: Math.sin(angle) * currentHazardSpeed
    });
    
    // Log the distance from player for debugging
    const distanceFromPlayer = getDistance(position, player.position);
    console.log(`Hazard created at distance ${Math.round(distanceFromPlayer)} from player (min: ${MIN_PLAYER_HAZARD_DISTANCE})`);
}

// Calculate distance between two points
function getDistance(point1, point2) {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}

// Get a safe position away from specified objects
function getSafePosition(width, height, minDistance, objectsToAvoid) {
    const margin = 100; // Minimum distance from walls
    let position;
    let isSafe = false;
    let attempts = 0;
    const maxAttempts = 200; // Increased max attempts to find a good position
    
    // Keep trying until we find a safe position or reach max attempts
    while (!isSafe && attempts < maxAttempts) {
        attempts++;
        
        // Generate random position
        position = {
            x: Math.random() * (width - 2 * margin) + margin,
            y: Math.random() * (height - 2 * margin) + margin
        };
        
        // Check if position is safe from all objects to avoid
        isSafe = true;
        for (const obj of objectsToAvoid) {
            if (!obj) continue; // Skip if object doesn't exist
            
            const distance = getDistance(position, obj.position);
            
            // If this is the player and we're checking for hazard placement, use MIN_PLAYER_HAZARD_DISTANCE
            if (obj.label === 'player' && minDistance === MIN_PLAYER_HAZARD_DISTANCE) {
                if (distance < MIN_PLAYER_HAZARD_DISTANCE) {
                    isSafe = false;
                    break;
                }
            } 
            // If this is another hazard, use MIN_HAZARD_HAZARD_DISTANCE
            else if (obj.label === 'hazard' && objectsToAvoid.includes(player)) {
                if (distance < MIN_HAZARD_HAZARD_DISTANCE) {
                    isSafe = false;
                    break;
                }
            }
            // For other objects, use the provided minDistance
            else if (distance < minDistance) {
                isSafe = false;
                break;
            }
        }
    }
    
    // If we couldn't find a safe position after max attempts, try with a reduced distance
    if (!isSafe && minDistance > 100) {
        console.log(`Could not find safe position after ${attempts} attempts. Reducing distance requirements.`);
        return getSafePosition(width, height, minDistance * 0.8, objectsToAvoid);
    }
    
    console.log(`Found safe position after ${attempts} attempts`);
    return position;
}

// Set up collision detection
function setupCollisions() {
    // Handle collision start events
    Events.on(engine, 'collisionStart', function(event) {
        // Skip collision handling if game is paused
        if (gamePaused || gameOver) return;
        
        const pairs = event.pairs;
        
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            
            // Check if player collides with target
            if ((pair.bodyA.label === 'player' && pair.bodyB.label === 'target') ||
                (pair.bodyA.label === 'target' && pair.bodyB.label === 'player')) {
                console.log("Player hit target! Completing level.");
                completeLevel();
                
                // Play target sound
                playSound(soundTarget);
                
                // Create particle effect at target position
                createParticleEffect(target.position.x, target.position.y, '#66ff66', 20);
            }
            
            // Check if player collides with hazard
            if ((pair.bodyA.label === 'player' && pair.bodyB.label === 'hazard') ||
                (pair.bodyA.label === 'hazard' && pair.bodyB.label === 'player')) {
                gameOverSequence();
                
                // Play hazard sound
                playSound(soundHazard);
                
                // Create particle effect at player position
                createParticleEffect(player.position.x, player.position.y, '#ff4d4d', 30);
            }
            
            // Check if hazard collides with target
            if ((pair.bodyA.label === 'hazard' && pair.bodyB.label === 'target') ||
                (pair.bodyA.label === 'target' && pair.bodyB.label === 'hazard')) {
                // Get the hazard
                const hazard = pair.bodyA.label === 'hazard' ? pair.bodyA : pair.bodyB;
                
                // Create a particle effect at collision point
                const collisionPoint = pair.collision.supports[0] || {
                    x: (hazard.position.x + target.position.x) / 2,
                    y: (hazard.position.y + target.position.y) / 2
                };
                
                // Create a spark effect with 5 particles
                createParticleEffect(collisionPoint.x, collisionPoint.y, getRandomDiscoColor(), 5);
                
                // Change color of hazard on target collision
                const newColor = getRandomDiscoColor();
                hazard.render.fillStyle = newColor;
                hazard.render.strokeStyle = getDarkerColor(newColor);
                
                // Apply a slight bounce effect
                const vx = hazard.velocity.x;
                const vy = hazard.velocity.y;
                const speed = Math.sqrt(vx * vx + vy * vy);
                
                // Calculate direction from target to hazard
                const dx = hazard.position.x - target.position.x;
                const dy = hazard.position.y - target.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Normalize and apply velocity
                if (distance > 0) {
                    Body.setVelocity(hazard, {
                        x: (dx / distance) * speed,
                        y: (dy / distance) * speed
                    });
                }
            }
            
            // Check if hazard collides with another hazard
            if (pair.bodyA.label === 'hazard' && pair.bodyB.label === 'hazard') {
                // Get the two hazards
                const hazardA = pair.bodyA;
                const hazardB = pair.bodyB;
                
                // Create a small particle effect at collision point
                const collisionPoint = pair.collision.supports[0] || {
                    x: (hazardA.position.x + hazardB.position.x) / 2,
                    y: (hazardA.position.y + hazardB.position.y) / 2
                };
                
                // Create a spark effect with 5 particles
                createParticleEffect(collisionPoint.x, collisionPoint.y, getRandomDiscoColor(), 5);
                
                // Change color of both hazards on collision
                const colorA = getRandomDiscoColor();
                const colorB = getRandomDiscoColor();
                
                hazardA.render.fillStyle = colorA;
                hazardA.render.strokeStyle = getDarkerColor(colorA);
                
                hazardB.render.fillStyle = colorB;
                hazardB.render.strokeStyle = getDarkerColor(colorB);
                
                // Occasionally apply a small random force to make collisions more chaotic
                if (Math.random() > 0.8) {
                    const forceMultiplier = 0.0005;
                    const randomAngle = Math.random() * Math.PI * 2;
                    const force = {
                        x: Math.cos(randomAngle) * forceMultiplier,
                        y: Math.sin(randomAngle) * forceMultiplier
                    };
                    
                    // Apply to either hazardA or hazardB randomly
                    const targetHazard = Math.random() > 0.5 ? hazardA : hazardB;
                    Body.applyForce(targetHazard, targetHazard.position, force);
                }
            }
            
            // Check if hazard collides with wall
            if ((pair.bodyA.label === 'hazard' && pair.bodyB.label === 'wall') ||
                (pair.bodyA.label === 'wall' && pair.bodyB.label === 'hazard')) {
                // Get the hazard
                const hazard = pair.bodyA.label === 'hazard' ? pair.bodyA : pair.bodyB;
                const wall = pair.bodyA.label === 'wall' ? pair.bodyA : pair.bodyB;
                
                // Create a particle effect at collision point
                const collisionPoint = pair.collision.supports[0] || {
                    x: hazard.position.x,
                    y: hazard.position.y
                };
                
                // Create a spark effect with 5 particles
                createParticleEffect(collisionPoint.x, collisionPoint.y, getRandomDiscoColor(), 5);
                
                // Always change color of hazard on wall collision
                const newColor = getRandomDiscoColor();
                hazard.render.fillStyle = newColor;
                hazard.render.strokeStyle = getDarkerColor(newColor);
            }
        }
    });
}

// Get a random disco color that's not the target color or player color
function getRandomDiscoColor() {
    // Array of vibrant disco colors
    const discoColors = [
        '#FF00FF', // Magenta
        '#00FFFF', // Cyan
        '#FFFF00', // Yellow
        '#FF00CC', // Hot Pink
        '#00FF00', // Lime
        '#FF6600', // Orange
        '#9900FF', // Purple
        '#00CCFF', // Sky Blue
        '#FF3399', // Rose
        '#CCFF00', // Chartreuse
        '#FF99CC', // Pink
        '#33CCFF', // Light Blue
        '#FFCC00', // Gold
        '#CC00FF', // Violet
        '#00FF99', // Spring Green
        '#FF3300'  // Red-Orange
    ];
    
    // Get a random color from the predefined disco colors
    let newColor;
    do {
        newColor = discoColors[Math.floor(Math.random() * discoColors.length)];
    } while (
        (target && newColor === '#66ff66') || // Make sure it's not the target color
        newColor === '#4da6ff'                // Make sure it's not the player color
    );
    
    return newColor;
}

// Get a darker version of a color for stroke
function getDarkerColor(color) {
    // For hex colors
    if (color.startsWith('#')) {
        // Convert hex to RGB
        let r = parseInt(color.slice(1, 3), 16);
        let g = parseInt(color.slice(3, 5), 16);
        let b = parseInt(color.slice(5, 7), 16);
        
        // Make it darker
        r = Math.max(0, r - 50);
        g = Math.max(0, g - 50);
        b = Math.max(0, b - 50);
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    // For other formats, return a default darker color
    return '#990000';
}

// Create particle effect
function createParticleEffect(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.width = `${Math.random() * 8 + 2}px`;
        particle.style.height = particle.style.width;
        
        // For disco effects, sometimes use a different color for each particle
        if (Math.random() > 0.7) {
            particle.style.background = getRandomDiscoColor();
        } else {
            particle.style.background = color;
        }
        
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        gameContainer.appendChild(particle);
        
        // Random direction and speed
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        // Animate particle
        let posX = x;
        let posY = y;
        let opacity = 1;
        let size = parseFloat(particle.style.width);
        
        const animate = () => {
            posX += vx;
            posY += vy;
            opacity -= 0.02;
            size *= 0.97;
            
            particle.style.left = `${posX}px`;
            particle.style.top = `${posY}px`;
            particle.style.opacity = opacity;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // For disco effects, occasionally change the particle color during animation
            if (Math.random() > 0.95) {
                particle.style.background = getRandomDiscoColor();
            }
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };
        
        requestAnimationFrame(animate);
    }
}

// Complete level
function completeLevel() {
    // Increase level
    currentLevel++;
    
    // Update level counter in UI
    document.getElementById('level-counter').textContent = `Level: ${currentLevel}`;
    
    // Update level complete message
    document.getElementById('completed-level').textContent = currentLevel - 1;
    
    // Show level complete message and pause game
    showLevelCompleteMessage();
    
    // Pause the game
    pauseGame();
}

// Game over sequence
function gameOverSequence() {
    if (gameOver) return; // Prevent multiple calls
    
    gameOver = true;
    
    // Update game over message with final stats
    document.getElementById('final-level').textContent = currentLevel;
    
    // Show game over message
    gameOverMessage.classList.remove('hidden');
    
    // Pause the game
    pauseGame();
}

// Restart game
function restartGame() {
    // Hide game over message
    gameOverMessage.classList.add('hidden');
    
    // Remove old target glow if it exists
    if (target && target.glowElement) {
        target.glowElement.remove();
    }
    
    // Remove player breathing element if it exists
    if (player && player.breathingElement) {
        player.breathingElement.remove();
    }
    
    // Remove any remaining trail elements
    if (player && player.trail) {
        player.trail.forEach(trail => {
            if (trail.element) trail.element.remove();
        });
        player.trail = [];
    }
    
    // Reset game state
    gameOver = false;
    currentLevel = 1;
    document.getElementById('level-counter').textContent = `Level: ${currentLevel}`;
    
    // Reset player position
    const width = gameContainer.clientWidth;
    const height = gameContainer.clientHeight;
    Body.setPosition(player, { x: width / 2, y: height / 2 });
    Body.setVelocity(player, { x: 0, y: 0 });
    
    // Add breathing effect to player
    //addPlayerBreathingEffect();
    
    // Remove old target and create new one
    World.remove(world, target);
    createTarget(width, height);
    
    // Remove old hazards and create new ones
    createHazards(width, height, currentLevel);
    
    // Record level start time
    levelStartTime = Date.now();
    
    // Resume the game
    gamePaused = false;
    Runner.run(runner, engine);
}

// Show level complete message
function showLevelCompleteMessage() {
    levelCompleteMessage.classList.remove('hidden');
}

// Hide level complete message
function hideLevelCompleteMessage() {
    levelCompleteMessage.classList.add('hidden');
}

// Pause the game
function pauseGame() {
    gamePaused = true;
    // Stop the runner
    Runner.stop(runner);
    
    console.log("Game paused");
}

// Resume the game and set up next level
function resumeGame() {
    // Prepare for next level first
    prepareNextLevel();
    
    // Then resume the game
    gamePaused = false;
    Runner.run(runner, engine);
    
    // Record level start time
    levelStartTime = Date.now();
    
    console.log("Game resumed");
}

// Prepare for the next level
function prepareNextLevel() {
    // Remove old target and its glow
    if (target && target.glowElement) {
        target.glowElement.remove();
    }
    World.remove(world, target);
    
    // Create new target
    const width = gameContainer.clientWidth;
    const height = gameContainer.clientHeight;
    createTarget(width, height);
    
    // Reset player position
    Body.setPosition(player, { x: width / 2, y: height / 2 });
    Body.setVelocity(player, { x: 0, y: 0 });
    
    // Create hazards for the new level
    createHazards(width, height, currentLevel);
    
    // Hide level complete message
    hideLevelCompleteMessage();
}

// Increase hazard speed
function increaseHazardSpeed() {
    // Increase speed but cap it at maximum
    currentHazardSpeed = Math.min(currentHazardSpeed * hazardSpeedMultiplier, maxHazardSpeed);
    
    // Apply new speed to all hazards while maintaining their direction
    hazards.forEach(hazard => {
        const velocity = hazard.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const direction = {
            x: velocity.x / speed,
            y: velocity.y / speed
        };
        
        Body.setVelocity(hazard, {
            x: direction.x * currentHazardSpeed,
            y: direction.y * currentHazardSpeed
        });
    });
    
    // Play speed up sound
    playSound(soundSpeedup);
}

// Reverse hazard directions
function reverseHazardDirections() {
    hazards.forEach(hazard => {
        const velocity = hazard.velocity;
        Body.setVelocity(hazard, {
            x: -velocity.x,
            y: -velocity.y
        });
    });
    
    // Play reverse sound
    playSound(soundReverse);
}

// Play sound with error handling
function playSound(sound) {
    if (!sound) return;
    
    try {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Sound play error:", e));
    } catch (e) {
        console.log("Sound error:", e);
    }
}

// Set up keyboard controls
function setupKeyboardControls() {
    window.addEventListener('keydown', function(event) {
        // If game is not started yet and space is pressed, start game
        if (!gameStarted && event.keyCode === 32) {
            startGame();
            return;
        }
        
        // If game is over and space bar is pressed, restart game
        if (gameOver && event.keyCode === 32) {
            restartGame();
            return;
        }
        
        // If game is paused and space bar is pressed, resume game
        if (gamePaused && !gameOver && event.keyCode === 32) { // 32 is space bar
            resumeGame();
            return;
        }
        
        // If game is paused or over or not started, don't process movement controls
        if (gamePaused || gameOver || !gameStarted) return;
        
        switch(event.keyCode) {
            // Left arrow
            case 37:
                Body.applyForce(player, player.position, { x: -playerForce, y: 0 });
                reverseHazardDirections(); // Reverse hazard directions
                break;
            // Up arrow
            case 38:
                Body.applyForce(player, player.position, { x: 0, y: -playerForce });
                increaseHazardSpeed(); // Increase hazard speed
                break;
            // Right arrow
            case 39:
                Body.applyForce(player, player.position, { x: playerForce, y: 0 });
                reverseHazardDirections(); // Reverse hazard directions
                break;
            // Down arrow
            case 40:
                Body.applyForce(player, player.position, { x: 0, y: playerForce });
                increaseHazardSpeed(); // Increase hazard speed
                break;
        }
    });
}

// Game loop
function gameLoop() {
    // Only update if game is not paused
    if (gameStarted && !gamePaused && !gameOver) {
        // Check if any hazards have escaped the boundaries and fix their positions
        checkHazardBoundaries();
        
        // Update target glow position if target exists
        if (target && target.glowElement) {
            target.glowElement.style.left = `${target.position.x - targetRadius * 1.2}px`; // Updated from 1.5 to 1.2
            target.glowElement.style.top = `${target.position.y - targetRadius * 1.2}px`;  // Updated from 1.5 to 1.2
        }
        
        // Update player breathing effect position
        if (player && player.breathingElement) {
            player.breathingElement.style.left = `${player.position.x - playerRadius * 1.2}px`;
            player.breathingElement.style.top = `${player.position.y - playerRadius * 1.2}px`;
        }
        
        // Update player trail
        updatePlayerTrail();
    }
    
    // Continue the loop
    requestAnimationFrame(gameLoop);
}

// Check and fix hazard positions if they escape boundaries
function checkHazardBoundaries() {
    const width = gameContainer.clientWidth;
    const height = gameContainer.clientHeight;
    const margin = 50; // Margin from edges
    
    hazards.forEach(hazard => {
        const pos = hazard.position;
        let needsRepositioning = false;
        
        // Check if hazard is outside boundaries
        if (pos.x < margin || pos.x > width - margin || pos.y < margin || pos.y > height - margin) {
            needsRepositioning = true;
        }
        
        // If hazard has escaped too far, teleport it back inside
        if (pos.x < -100 || pos.x > width + 100 || pos.y < -100 || pos.y > height + 100) {
            console.log("Hazard escaped, repositioning");
            
            // Get current velocity and direction
            const velocity = hazard.velocity;
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            
            // Reposition to a random location inside boundaries
            const newPos = {
                x: Math.random() * (width - 2 * margin) + margin,
                y: Math.random() * (height - 2 * margin) + margin
            };
            
            // Teleport the hazard
            Body.setPosition(hazard, newPos);
            
            // Ensure it's still moving at the correct speed
            const angle = Math.random() * Math.PI * 2;
            Body.setVelocity(hazard, {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            });
        }
    });
}

// Update player trail
function updatePlayerTrail() {
    if (!player || !player.trail) return;
    
    // Only add a new trail element if the player is moving at a certain speed
    const velocity = player.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    
    // Add new trail element if player is moving fast enough and enough time has passed
    const now = Date.now();
    if (speed > 0.5 && now - player.lastTrailTime > 50) { // Add trail every 50ms when moving
        player.lastTrailTime = now;
        
        // Create a new trail element
        const trailElement = document.createElement('div');
        trailElement.className = 'player-trail';
        trailElement.style.position = 'absolute';
        
        // Make trail circles closer to player size (90% of player size)
        const trailSize = playerRadius * 2; // Increased from 1.4 to 1.8
        trailElement.style.width = `${trailSize}px`;
        trailElement.style.height = `${trailSize}px`;
        
        // Center the trail element at the player's current position
        trailElement.style.left = `${player.position.x - trailSize/2}px`;
        trailElement.style.top = `${player.position.y - trailSize/2}px`;
        
        trailElement.style.borderRadius = '50%';
        trailElement.style.backgroundColor = 'rgba(77, 166, 255, 0.3)';
        trailElement.style.opacity = '0.7';
        trailElement.style.zIndex = '3';
        
        // Add to game container
        gameContainer.appendChild(trailElement);
        
        // Add to trail array with creation timestamp
        player.trail.push({
            element: trailElement,
            createdAt: now,
            x: player.position.x,
            y: player.position.y
        });
        
        // Limit trail length
        if (player.trail.length > 5) {
            const oldestTrail = player.trail.shift();
            if (oldestTrail && oldestTrail.element) {
                oldestTrail.element.remove();
            }
        }
    }
    
    // Fade out existing trail elements
    for (let i = player.trail.length - 1; i >= 0; i--) {
        const trail = player.trail[i];
        if (!trail || !trail.element) {
            player.trail.splice(i, 1);
            continue;
        }
        
        const age = now - trail.createdAt;
        const maxAge = 300; // Trail elements last for 300ms
        
        if (age > maxAge) {
            // Remove old trail element
            trail.element.remove();
            player.trail.splice(i, 1);
        } else {
            // Fade out based on age
            const opacity = 0.7 * (1 - age / maxAge);
            
            // Start with a size closer to the player size and shrink less
            const scale = playerRadius * 1.8 * (1 - 0.2 * (age / maxAge));
            
            trail.element.style.opacity = opacity.toString();
            trail.element.style.width = `${scale}px`;
            trail.element.style.height = `${scale}px`;
            trail.element.style.left = `${trail.x - scale/2}px`;
            trail.element.style.top = `${trail.y - scale/2}px`;
        }
    }
}

// Handle window resize
function handleResize() {
    if (render) {
        // Get new dimensions
        const width = gameContainer.clientWidth;
        const height = gameContainer.clientHeight;
        
        // Update render canvas size
        render.options.width = width;
        render.options.height = height;
        render.canvas.width = width;
        render.canvas.height = height;
        
        // Update walls (remove old walls and add new ones)
        walls.forEach(wall => World.remove(world, wall));
        createWalls(width, height);
        
        // Trigger a render
        Render.setPixelRatio(render, window.devicePixelRatio);
    }
}

// Add CSS styles for target glow animation
function addTargetGlowStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes targetGlow {
            0% {
                box-shadow: 0 0 20px 15px rgba(102, 255, 102, 0.5), inset 0 0 10px 5px rgba(102, 255, 102, 0.3);
                background-color: rgba(102, 255, 102, 0.05);
            }
            100% {
                box-shadow: 0 0 30px 20px rgba(102, 255, 102, 0.8), inset 0 0 15px 7px rgba(102, 255, 102, 0.6);
                background-color: rgba(102, 255, 102, 0.15);
            }
        }
        
        .target-glow {
            pointer-events: none;
            position: absolute;
            border-radius: 50%;
            animation: targetGlow 2s infinite alternate ease-in-out;
        }
        
        @keyframes playerBreathing {
            0% {
                transform: scale(0.85);
                opacity: 0.5;
                box-shadow: 0 0 8px 4px rgba(77, 166, 255, 0.3);
                border: 2px solid rgba(77, 166, 255, 0.4);
            }
            100% {
                transform: scale(1.15);
                opacity: 0.9;
                box-shadow: 0 0 15px 7px rgba(77, 166, 255, 0.5);
                border: 2px solid rgba(77, 166, 255, 0.8);
            }
        }
        
        .player-trail {
            position: absolute;
            border-radius: 50%;
            background-color: rgba(77, 166, 255, 0.3);
            pointer-events: none;
            z-index: 3;
        }
    `;
    document.head.appendChild(style);
}

// Initialize the game when the window loads
window.addEventListener('load', init); 