# FTC: Into The Deep Game

A web-based game inspired by the FIRST Tech Challenge "Into The Deep" season. Control a robot on a 12x12 foot field, collect pixels from the Submersible zone, and deposit them in baskets to score points.

## Game Overview

In this game, you control a robot from an overhead view of the FTC "Into The Deep" field. The objective is to collect pixels from the Submersible zone using your robot's linear slides and deposit them in baskets to score points.

## Controls

- **W**: Move forward (in the direction the robot is facing)
- **S**: Move backward
- **A**: Rotate counter-clockwise
- **D**: Rotate clockwise
- **SPACE**: Press to extend linear slides, release to retract and intake pixels
- **I**: Press to drop/outtake a pixel from the front of the robot

## Game Elements

- **Robot**: The red square representing a 14x14 inch robot with a yellow direction indicator
- **Linear Slides**: Gray extensions that smoothly slide out from the back of the robot when SPACE is pressed
- **Outtake Mechanism**: Gray extension that appears at the front of the robot when holding a pixel
- **Submersible Zone**: Blue rectangular area in the center of the field (29x48 inches) that the robot cannot enter
- **Pixels**: Rectangular game elements (1.5x3.5 inches) in three colors (yellow, blue, and red)
- **Baskets**: Small green rectangular scoring areas in opposite corners of the field (top-right and bottom-left)

## How to Play

1. Navigate your robot near the Submersible zone
2. Press and hold SPACE to extend your linear slides toward a pixel
3. Release SPACE to retract the slides and intake the pixel if your slides are touching it
4. The pixel will transfer to the front of your robot and be held in the outtake mechanism
5. Navigate to one of the baskets in the corners
6. Position your robot so the outtake mechanism is touching a basket
7. Press the "I" key to drop the pixel
8. If your outtake is touching a basket, you'll score 8 points
9. If not, the pixel will drop to the floor and can be picked up again

## Scoring

- Each pixel is worth 8 points
- Pixels do not regenerate, so there are a limited number in each game
- Pixels that are dropped on the floor can be picked up again
- Try to collect all 60 pixels for a maximum score of 480 points

## Game Mechanics

- No part of the robot can enter the Submersible zone (including edges and corners)
- The game uses advanced collision detection to prevent any part of the robot from entering the zone
- Rotation is blocked if it would cause the robot to intersect with the Submersible zone
- Linear slides animate smoothly when extending and retracting
- Pixels transfer from the slides to the front outtake when slides retract
- Pixels are oriented perpendicular to the robot when in the outtake
- The outtake mechanism extends from the front of the robot when holding a pixel
- Pixels are only dropped when the "I" key is pressed
- Pixels are only scored if the outtake is physically touching a basket
- Dropped pixels remain on the field and can be collected again

## Running the Game

Simply open the `index.html` file in a web browser to start playing.

## Technical Details

This game is built using HTML5 Canvas and JavaScript. The field is scaled to represent a 12x12 foot FTC field, and the robot moves in a robot-centric manner (forward is always the direction the robot is facing). The Submersible zone in the center is impenetrable, and the robot must use its linear slides to collect pixels from within this zone.

Enjoy playing! 