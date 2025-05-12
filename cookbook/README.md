# Cookbook - Recipe Website

A beautiful, aesthetically pleasing recipe website with a unique roladex-style card interface.

## Features

- Elegant pastel brown color scheme
- Interactive recipe card carousel that resembles a rolling drum/roladex
- Recipe cards with emoji icons, titles, and descriptions
- Detailed recipe view showing ingredients and instructions
- Responsive design that works on mobile and desktop

## How to Use

1. Open `index.html` in your web browser
2. Scroll through recipe cards using:
   - Mouse wheel up/down
   - Up/down arrow keys
   - Touch drag (on mobile devices)
   - Clicking directly on cards
3. The recipe card in the center of the screen is active and shows its details in the right panel
4. Recipe details include ingredients list and step-by-step instructions

## Recipe Collection

The site comes with several sample recipes:
- Spaghetti Carbonara
- Greek Salad
- Chocolate Cake
- Vegetable Soup
- Banana Bread
- Butter Chicken

## Customization

To add your own recipes, edit the `recipes.js` file and follow the same data structure format:

```javascript
{
    id: [unique number],
    emoji: "[food emoji]",
    title: "[Recipe Name]",
    description: "[Brief description]",
    ingredients: [
        "[ingredient 1]",
        "[ingredient 2]",
        // ...
    ],
    instructions: [
        "[step 1]",
        "[step 2]",
        // ...
    ]
}
```

## Technologies Used

- HTML5
- CSS3 (with modern features like CSS Grid, Flexbox, and CSS Variables)
- Vanilla JavaScript (no frameworks required) 