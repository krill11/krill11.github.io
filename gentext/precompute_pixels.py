import json
from text_to_image import *
import colorsys

def main():
    print("Loading and processing text...")
    
    # Load and process text
    text = load_text('text.txt')
    words = preprocess_text(text)
    
    # Analyze sentiment
    sentiments, raw_scores = analyze_sentiment(words)
    unique_sentiments = unique_sentiment_assignment(words, sentiments)
    enhanced_unique_sentiments = enhance_sentiment_diversity(unique_sentiments)
    
    # Analyze word features
    original_features = analyze_word_features(words)
    
    # Create standard visualization first
    img_standard, width_standard, height_standard = create_multi_feature_image(words, enhanced_unique_sentiments, original_features)
    pixels_standard = img_standard.load()
    
    # Extract all pixel data and identify collapsible pixels (close to white)
    all_pixels = []
    collapsed_pixels = []
    WHITE_THRESHOLD = 200  # RGB values must be > 200 to be considered "close to white"
    
    for y in range(height_standard):
        for x in range(width_standard):
            r, g, b = pixels_standard[x, y]
            all_pixels.append({
                'color': f'rgb({r},{g},{b})',
                'x': x,
                'y': y
            })
            # Check if pixel is close to white
            if r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD:
                collapsed_pixels.append({
                    'color': f'rgb({r},{g},{b})',
                    'x': x,
                    'y': y
                })
    
    # Save to JSON
    with open('pixel_data.json', 'w') as f:
        json.dump({
            'allPixels': all_pixels,
            'collapsedPixels': collapsed_pixels,
            'standardDimensions': {
                'width': width_standard,
                'height': height_standard
            },
            'collapsedDimensions': {
                'width': width_standard,  # Use standard dimensions since we're keeping original coordinates
                'height': height_standard
            }
        }, f)
    
    print(f"Saved {len(all_pixels)} total pixels and {len(collapsed_pixels)} collapsed pixels to pixel_data.json")

if __name__ == "__main__":
    main() 