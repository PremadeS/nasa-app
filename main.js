import Phaser from 'phaser';

const config = {
  type : Phaser.AUTO,
  width : window.innerWidth,
  height : window.innerHeight,
  physics : {
    default : 'arcade',
    arcade : {
      gravity : {y : 0},
      debug : false
    }
  },
  scene : {
    preload : preload,
    create : create,
    update : update
  }
};

let spaceship;
let cursors;
let background;
let isReturning = false;         // Track whether the spaceship is returning to the center
let returnTween;                 // Store reference to the tween
let planets;                     // Group for planets
const returnSpeed = 100;         // Time (in ms) to return to the center
const moveSpeed = 3;             // Speed of movement when controlled by the player
const planetMoveSpeed = 5;       // Speed of movement for planets
const planetSpawnDistance = 100; // Distance from the screen edges to spawn planets
const game = new Phaser.Game(config);

function preload() {
  this.load.image('spaceship', 'path/to/your/spaceship.png');
  this.load.image('background', 'bgtile.jpg');
  this.load.image('planet', 'planet.png'); // Replace with your planet image path
}

function create() {
  background = this.add.tileSprite(0, 0, config.width, config.height, 'background');
  background.setOrigin(0, 0);

  spaceship = this.physics.add.sprite(this.scale.width / 2, this.scale.height / 2, 'spaceship');
  spaceship.setDepth(10);
  spaceship.setDrag(200); // Add some drag to the spaceship for smoother stopping

  cursors = this.input.keyboard.createCursorKeys();
  this.input.keyboard.addKeys('W,A,S,D');

  planets = this.physics.add.group(); // Create a group for planets

  this.cameras.main.startFollow(spaceship, true, 0.05, 0.05);
  this.cameras.main.setZoom(1.5);

  // Spawn initial planets
  spawnRandomPlanets(this);

  window.addEventListener('resize', () => resizeGame(this));
}

function update() {
  let velocityX = 0;
  let velocityY = 0;

  // Check for input and move spaceship
  if (this.input.keyboard.keys[87].isDown) { // W key
    velocityY = -moveSpeed;
    background.tilePositionY -= 3;
  }
  if (this.input.keyboard.keys[83].isDown) { // S key
    velocityY = moveSpeed;
    background.tilePositionY += 3;
  }

  if (this.input.keyboard.keys[65].isDown) { // A key
    velocityX = -moveSpeed;
    background.tilePositionX -= 3;
  }
  if (this.input.keyboard.keys[68].isDown) { // D key
    velocityX = moveSpeed;
    background.tilePositionX += 3;
  }

  if (velocityX !== 0 || velocityY !== 0) {
    spaceship.setVelocity(velocityX, velocityY);

    if (isReturning) {
      returnTween.stop();  // Stop the tween
      isReturning = false; // Reset the flag
    }

    // Move planets relative to the spaceship
    planets.children.each(planet => {
      planet.x -= (velocityX * planetMoveSpeed) / moveSpeed; // Move planets slower
      planet.y -= (velocityY * planetMoveSpeed) / moveSpeed;

      const distance = Phaser.Math.Distance.Between(spaceship.x, spaceship.y, planet.x, planet.y);
      if (distance < 150 && planet.scale == planet.initialScale) {
        smoothScale(planet, planet.initialScale + 0.2, 150);
        changeColor(planet, false); // Change color as it grows
      } else if (distance >= 150 && planet.scale > planet.initialScale) {
        smoothScale(planet, planet.initialScale, 150);
        changeColor(planet, true); // Reset color when scaling down
      }

      // Destroy planets that move off-screen
      if (planet.x < -planet.width || planet.x > config.width + planet.width ||
          planet.y < -planet.height || planet.y > config.height + planet.height) {
        planet.destroy();
      }
    });

    // Randomly spawn new planets outside the viewable area
    if (Phaser.Math.Between(0, 100) > 97) { // 2% chance to spawn a planet per frame
      spawnRandomPlanets(this);
    }
  }

  background.tilePositionX += 0.5;
}

function spawnRandomPlanets(scene) {
  let x, y;
  let overlap = true;
  let limit = 0;

  // Keep generating a new position until there is no overlap
  while (overlap && limit < 100) {
    if (Phaser.Math.Between(0, 1)) {
      x = Phaser.Math.Between(-planetSpawnDistance, config.width + planetSpawnDistance);
      y = Phaser.Math.Between(-planetSpawnDistance, 0); // Above or below screen
    } else {
      x = Phaser.Math.Between(-planetSpawnDistance, config.width + planetSpawnDistance);
      y = Phaser.Math.Between(config.height, config.height + planetSpawnDistance); // Above or below screen
    }

    overlap = false;

    // Check if the new planet would overlap with any existing planet
    planets.children.each(planet => {
      let distance = Phaser.Math.Distance.Between(x, y, planet.x, planet.y);
      if (distance < planet.width) {
        overlap = true;
      }
    });

    ++limit; // to avoid inifinite loop bruv..
  }

  // Create a new planet at a valid non-overlapping position
  let planet = planets.create(x, y, 'planet');
  planet.setScale(Phaser.Math.FloatBetween(0.4, 1)); // Random size
  planet.initialScale = planet.scale;
  planet.setDepth(5); // Ensure planets have a lower depth than spaceship

  // Set initial dark color (half-colored) by applying a tint
  planet.setTint(0x333333); // Dark gray tint
}

function resizeGame(scene) {
  // Set new width and height based on window size
  game.scale.resize(window.innerWidth, window.innerHeight);

  // Update the background to cover the new size
  background.setSize(window.innerWidth, window.innerHeight);
}

function smoothScale(planet, targetScale, duration) {
  const initialScale = planet.scale;                        // Get the initial scale
  const scaleChange = targetScale - initialScale;           // Calculate the change in scale
  const frameDuration = 16.67;                              // Approximate time per frame at 60 FPS
  const totalFrames = Math.floor(duration / frameDuration); // Total frames for the duration
  let currentFrame = 0;

  const easeOut = (t) => {
    return 1 - Math.pow(1 - t, 2); // Quadratic ease-out function
  };

  const scalePlanet = () => {
    if (currentFrame < totalFrames) {
      currentFrame++;
      const t = currentFrame / totalFrames;                   // Normalized time (0 to 1)
      const easedT = easeOut(t);                              // Apply ease-out function
      const newScale = initialScale + (scaleChange * easedT); // Calculate new scale
      planet.setScale(newScale);                              // Set the new scale
      requestAnimationFrame(scalePlanet);                     // Continue scaling in the next frame
    } else {
      planet.setScale(targetScale); // Ensure it ends exactly at the target scale
    }
  };

  scalePlanet(); // Start the scaling loop
}

function changeColor(planet, setTint) {
  const fadeDuration = 150;                            // Duration for fade-in in milliseconds
  const fadeFrames = Math.floor(fadeDuration / 16.67); // Approximate frames at 60 FPS
  let currentFrame = 0;

  if (setTint) {
    const fadeIn = () => {
      if (currentFrame < fadeFrames) {
        currentFrame++;
        const tintColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            {r : 255, g : 255, b : 255}, // White (no tint)
            {r : 51, g : 51, b : 51},    // Dark gray tint
            fadeFrames,
            currentFrame);
        planet.setTint(Phaser.Display.Color.GetColor(tintColor.r, tintColor.g, tintColor.b));
        requestAnimationFrame(fadeIn); // Continue fading in the next frame
      } else {
        planet.setTint(0x333333); // Set final tint color after fade completes
      }
    };
    fadeIn(); // Start the fade-in process
  } else {
    // Gradually fade out the tint over multiple frames
    const fadeOut = () => {
      if (currentFrame < fadeFrames) {
        currentFrame++;
        const tintColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            {r : 51, g : 51, b : 51},    // Dark gray
            {r : 255, g : 255, b : 255}, // White (no tint)
            fadeFrames,
            currentFrame);
        planet.setTint(Phaser.Display.Color.GetColor(tintColor.r, tintColor.g, tintColor.b));
        requestAnimationFrame(fadeOut); // Continue fading in the next frame
      } else {
        planet.clearTint(); // Clear the tint after fade completes
      }
    };
    fadeOut(); // Start the fade-out process
  }
}

game.scene.start(config.scene);
