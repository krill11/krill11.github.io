import nltk
import numpy as np
from PIL import Image
import math
import re
import sys
import colorsys
import random
import hashlib
import string
from collections import defaultdict
from tqdm import tqdm

# Download the VADER lexicon for sentiment analysis with error handling
try:
    nltk.download('vader_lexicon', quiet=True)
    from nltk.sentiment.vader import SentimentIntensityAnalyzer
except LookupError as e:
    print("Error downloading VADER lexicon:")
    print(e)
    print("\nPlease run the following commands in a Python shell:")
    print(">>> import nltk")
    print(">>> nltk.download('vader_lexicon')")
    sys.exit(1)
except Exception as e:
    print(f"An unexpected error occurred: {e}")
    sys.exit(1)

def load_text(file_path):
    """Load text from a file."""
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()

def preprocess_text(text):
    """Split text into words and remove punctuation."""
    # Replace newlines with spaces
    text = text.replace('\n', ' ')
    # Split text into words
    words = re.findall(r'\b\w+\b', text.lower())
    return words

def analyze_sentiment(words):
    """Analyze sentiment of each word."""
    sia = SentimentIntensityAnalyzer()
    sentiments = []
    raw_scores = []
    
    # Get sentiment for each word
    for word in words:
        score = sia.polarity_scores(word)
        # Use compound score which is a normalized score between -1 and 1
        sentiments.append(score['compound'])
        
        # Store the component scores too (useful for debugging)
        raw_scores.append({
            'word': word,
            'compound': score['compound'],
            'pos': score['pos'],
            'neg': score['neg'],
            'neu': score['neu']
        })
    
    # Print some statistics for debugging
    print("\nSentiment score statistics:")
    print(f"Range: {min(sentiments)} to {max(sentiments)}")
    print(f"Number of unique scores: {len(set(sentiments))}")
    zero_count = sum(1 for s in sentiments if s == 0)
    print(f"Words with zero sentiment: {zero_count} ({zero_count/len(sentiments):.1%} of total)")
    
    # Print a few examples of words with their scores
    print("\nSample word sentiment scores:")
    sample_indices = random.sample(range(len(words)), min(10, len(words)))
    for i in sample_indices:
        print(f"'{words[i]}': {sentiments[i]} (pos: {raw_scores[i]['pos']}, neg: {raw_scores[i]['neg']}, neu: {raw_scores[i]['neu']})")
    
    return sentiments, raw_scores

def enhance_sentiment_diversity(sentiments):
    """
    Apply a transformation to increase the diversity of sentiment scores.
    This helps avoid clustering around neutral values.
    """
    # Step 1: Normalize to 0-1 range
    min_sent = min(sentiments)
    max_sent = max(sentiments)
    
    # Handle case where all sentiments are the same
    if min_sent == max_sent:
        return [0.5 for _ in sentiments]
    
    # Normalize to 0-1 range
    normalized = [(s - min_sent) / (max_sent - min_sent) for s in sentiments]
    
    # Step 2: Apply a power transformation to spread out the values
    # Values < 0.5 will move toward 0, values > 0.5 will move toward 1
    enhanced = []
    for score in normalized:
        # Use a sigmoid-like curve to expand the range
        if score <= 0.5:
            # Map lower half to expand toward 0
            new_score = (score * 2) ** 1.5 / 2
        else:
            # Map upper half to expand toward 1
            new_score = 1 - ((1 - score) * 2) ** 1.5 / 2
        enhanced.append(new_score)
    
    return enhanced

def unique_sentiment_assignment(words, sentiments):
    """
    Make neutral words more unique by assigning them a gradient of values
    or using word-specific characteristics to create pseudo-sentiments.
    """
    improved_sentiments = []
    
    # Group similar sentiment words to track consecutive neutral words
    groups = []
    current_group = []
    current_sentiment = None
    
    # First, group words by similar sentiment
    for i, (word, sentiment) in enumerate(zip(words, sentiments)):
        # Use a very small threshold to consider sentiments as "same"
        if current_sentiment is None or abs(sentiment - current_sentiment) > 0.05:
            if current_group:
                groups.append((current_group, current_sentiment))
            current_group = [i]
            current_sentiment = sentiment
        else:
            current_group.append(i)
    
    # Add the last group
    if current_group:
        groups.append((current_group, current_sentiment))
    
    # Start with original sentiment values
    improved_sentiments = sentiments.copy()
    
    # Process each group
    for group_indices, sentiment in groups:
        # If it's a nearly neutral sentiment and there are multiple words
        if abs(sentiment) < 0.1 and len(group_indices) > 1:
            # Spread these neutral words across a small range to create variety
            spread = 0.2  # The range to spread across
            base = sentiment - spread/2  # Center the spread around the original sentiment
            
            for idx, word_idx in enumerate(group_indices):
                word = words[word_idx]
                
                # Option 1: Gradient across the group
                gradient_value = base + (idx / (len(group_indices) - 1 or 1)) * spread
                
                # Option 2: Use word hash for a pseudo-random but consistent value
                word_hash = hash(word) % 1000 / 1000
                hash_value = base + word_hash * spread
                
                # Option 3: Use linguistic features
                vowel_ratio = sum(1 for c in word if c.lower() in 'aeiou') / (len(word) or 1)
                length_factor = min(len(word) / 10, 1.0)
                feature_value = base + ((vowel_ratio + length_factor) / 2) * spread
                
                # Combine approaches: 60% gradient, 20% hash, 20% features
                improved_sentiments[word_idx] = 0.6 * gradient_value + 0.2 * hash_value + 0.2 * feature_value
                
    return improved_sentiments

def collapse_neutral_words(words, sentiments, threshold=0.05):
    """
    Collapse consecutive words with neutral sentiment into single entries.
    Returns filtered words and sentiments.
    """
    if not words:
        return [], []
        
    filtered_words = []
    filtered_sentiments = []
    filtered_indices = []  # To track which original indices are kept
    
    # Start with the first word
    current_word = words[0]
    current_sentiment = sentiments[0]
    current_count = 1
    neutral_streak = abs(current_sentiment) < threshold
    
    for i in range(1, len(words)):
        # If this word is neutral and the previous word was also neutral
        if abs(sentiments[i]) < threshold and neutral_streak:
            # Accumulate the neutral word
            current_count += 1
            # If it's not a common word like articles or prepositions, update current_word
            if len(words[i]) > 3:  # Skip short common words
                current_word = words[i]
        else:
            # Add the previous word or word group
            if current_count > 1 and neutral_streak:
                # Add the most interesting word from the neutral group
                filtered_words.append(f"{current_word} (+{current_count-1})")
                # Average sentiment of the group
                filtered_sentiments.append(current_sentiment)
                filtered_indices.append(i - current_count)
            else:
                filtered_words.append(words[i-1])
                filtered_sentiments.append(sentiments[i-1])
                filtered_indices.append(i-1)
            
            # Start a new group
            current_word = words[i]
            current_sentiment = sentiments[i]
            current_count = 1
            neutral_streak = abs(current_sentiment) < threshold
    
    # Add the last word or group
    if current_count > 1 and neutral_streak:
        filtered_words.append(f"{current_word} (+{current_count-1})")
        filtered_sentiments.append(current_sentiment)
        filtered_indices.append(len(words) - current_count)
    else:
        filtered_words.append(words[-1])
        filtered_sentiments.append(sentiments[-1])
        filtered_indices.append(len(words) - 1)
    
    print(f"Collapsed {len(words)} words to {len(filtered_words)} entries by combining neutral words")
    
    return filtered_words, filtered_sentiments, filtered_indices

def sentiment_to_color(sentiment):
    """
    Convert sentiment to color using a rainbow gradient:
    - Lowest sentiment (0): Red (beginning of rainbow)
    - Highest sentiment (1): Purple (end of rainbow)
    
    The rainbow progression is: Red -> Orange -> Yellow -> Green -> Blue -> Indigo -> Violet/Purple
    """
    # Use HSV color space for the rainbow effect
    # Hue values in HSV:
    # Red: 0/360, Orange: 30/360, Yellow: 60/360, Green: 120/360, 
    # Blue: 240/360, Indigo: 270/360, Violet/Purple: 300/360
    
    # Map sentiment 0-1 to hue 0-300/360 (red to purple)
    h = sentiment * 300 / 360  # Normalized to 0-1 range
    s = 0.9 + sentiment * 0.1  # High saturation with slight variation
    v = 0.9 + sentiment * 0.1  # High brightness with slight variation
    
    # Convert HSV to RGB (values between 0-1)
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    
    # Convert to 0-255 range for PIL
    r = int(r * 255)
    g = int(g * 255)
    b = int(b * 255)
    
    return (r, g, b)

def word_to_color_hash(word, base_hue=None):
    """Generate a color based on word hash, optionally anchored to a base hue."""
    # Get hash of the word
    hash_obj = hashlib.md5(word.encode())
    hash_digest = hash_obj.digest()
    
    # Use the first 3 bytes for HSV values
    if base_hue is None:
        # Full random color based on word hash
        h = hash_digest[0] / 255
    else:
        # Constrained hue variation around base_hue (+/- 0.1)
        h = base_hue + (hash_digest[0] / 255 - 0.5) * 0.2
        h = h % 1.0  # Keep in range [0, 1]
    
    # Use other bytes for saturation and value
    s = 0.7 + (hash_digest[1] / 255) * 0.3  # 0.7-1.0 range for saturation
    v = 0.8 + (hash_digest[2] / 255) * 0.2  # 0.8-1.0 range for value
    
    # Convert HSV to RGB
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    
    # Convert to 0-255 range for PIL
    r = int(r * 255)
    g = int(g * 255)
    b = int(b * 255)
    
    return (r, g, b)

def analyze_word_features(words):
    """Extract multiple features from words for visualization."""
    features = []
    
    for word in words:
        # Length of word (normalized)
        length = len(word) / 20  # Assume max word length of 20
        length = min(length, 1.0)  # Cap at 1.0
        
        # Vowel ratio
        vowels = sum(1 for char in word if char.lower() in 'aeiou')
        vowel_ratio = vowels / max(len(word), 1)
        
        # First letter position in alphabet (a=0, z=25)
        if word and word[0] in string.ascii_letters:
            first_letter_pos = (ord(word[0].lower()) - ord('a')) / 25
        else:
            first_letter_pos = 0.5  # Default for non-letter starting words
        
        # Last letter position
        if word and word[-1] in string.ascii_letters:
            last_letter_pos = (ord(word[-1].lower()) - ord('a')) / 25
        else:
            last_letter_pos = 0.5
        
        # Count uppercase letters ratio (measure of emphasis)
        if word:
            uppercase_ratio = sum(1 for char in word if char.isupper()) / len(word)
        else:
            uppercase_ratio = 0
        
        features.append({
            'word': word,
            'length': length,
            'vowel_ratio': vowel_ratio,
            'first_letter_pos': first_letter_pos,
            'last_letter_pos': last_letter_pos,
            'uppercase_ratio': uppercase_ratio
        })
    
    return features

def create_multi_feature_image(words, sentiments, word_features):
    """Create an image where each pixel's color is based on multiple word features."""
    num_words = len(words)
    
    # Calculate dimensions for a square-like image
    width = math.ceil(math.sqrt(num_words))
    height = math.ceil(num_words / width)
    total_pixels = min(num_words, width * height)
    
    # Create coordinate arrays
    x_coords = np.arange(total_pixels) % width
    y_coords = np.arange(total_pixels) // width
    coords = np.stack((x_coords, y_coords), axis=1)
    
    # Convert sentiments and features to numpy arrays
    sentiments = np.array(sentiments[:total_pixels])
    vowel_ratios = np.array([f['vowel_ratio'] for f in word_features[:total_pixels]])
    lengths = np.array([f['length'] for f in word_features[:total_pixels]])
    
    # Find strong sentiment indices
    sentiment_diffs = np.abs(sentiments - 0.5)
    strong_mask = sentiment_diffs > 0.35
    strong_indices = np.where(strong_mask)[0]
    strong_sentiments = sentiments[strong_indices]
    strong_coords = coords[strong_indices]
    
    # Calculate sentiment types and strengths
    is_negative = strong_sentiments < 0.5
    sentiment_types = np.where(is_negative, 'negative', 'positive')
    base_strengths = sentiment_diffs[strong_indices]
    influence_strengths = np.where(is_negative, 
                                 base_strengths * 1.45,
                                 base_strengths * 0.95)
    
    # Pre-calculate all pairwise distances between strong sentiment pixels
    strong_x = strong_coords[:, 0][:, np.newaxis]
    strong_y = strong_coords[:, 1][:, np.newaxis]
    dx = strong_x - strong_x.T
    dy = strong_y - strong_y.T
    strong_distances = np.sqrt(dx**2 + dy**2)
    
    # Create output arrays
    hues = sentiments * 0.83
    saturations = 0.6 + vowel_ratios * 0.4
    values = 0.7 + lengths * 0.3
    
    # Calculate sentiment intensities
    sentiment_intensities = sentiment_diffs * 2
    
    # Adjust base colors by sentiment intensity
    saturations *= sentiment_intensities
    values = values * sentiment_intensities + (1 - sentiment_intensities) * 0.95
    
    # Process weak sentiment pixels
    weak_mask = ~strong_mask
    weak_indices = np.where(weak_mask)[0]
    
    if len(strong_indices) > 0 and len(weak_indices) > 0:
        print("Processing influence calculations...")
        
        # Calculate distances from each weak pixel to each strong pixel
        weak_coords = coords[weak_indices]
        
        # Process in batches to avoid memory issues
        batch_size = 1000
        for batch_start in tqdm(range(0, len(weak_indices), batch_size), desc="Processing batches"):
            batch_end = min(batch_start + batch_size, len(weak_indices))
            batch_weak = weak_indices[batch_start:batch_end]
            batch_coords = coords[batch_weak]
            
            # Calculate distances to all strong pixels
            dx = batch_coords[:, 0, np.newaxis] - strong_coords[:, 0]
            dy = batch_coords[:, 1, np.newaxis] - strong_coords[:, 1]
            distances = np.sqrt(dx**2 + dy**2)
            
            # Calculate linear distances
            linear_distances = np.abs(batch_weak[:, np.newaxis] - strong_indices)
            
            # Calculate similar sentiment boosts for each strong pixel
            similar_boosts = np.zeros(len(strong_indices))
            for i in range(len(strong_indices)):
                nearby_mask = (strong_distances[i] < 4) & (strong_distances[i] > 0)
                same_type = sentiment_types == sentiment_types[i]
                boost = np.sum(np.maximum(0, 1 - (strong_distances[i][nearby_mask & same_type] / 4)) * 0.45)
                similar_boosts[i] = boost
            
            # Calculate influence radii
            base_radii = np.where(is_negative, 4.2, 3.8)
            strength_factors = np.where(is_negative, 5.7, 4.8)
            influence_radii = (base_radii + influence_strengths * strength_factors) * (1 + similar_boosts)
            influence_radii = influence_radii[np.newaxis, :]
            
            # Calculate grid and linear weights
            grid_weights = np.where(is_negative, 0.65, 0.7)
            linear_weights = np.where(is_negative, 0.35, 0.3)
            distance_scales = np.where(is_negative, 0.85, 1.0) * (1 - similar_boosts * 0.7)
            
            # Calculate adjusted distances
            adjusted_distances = (grid_weights * distances + linear_weights * (linear_distances / 7)) * distance_scales[np.newaxis, :]
            
            # Calculate influences
            influence_mask = adjusted_distances < influence_radii
            influences = np.zeros_like(adjusted_distances)
            masked_distances = adjusted_distances[influence_mask]
            masked_radii = np.repeat(influence_radii, np.sum(influence_mask, axis=0))[0]
            masked_boosts = np.repeat(similar_boosts[None, :], batch_end - batch_start, axis=0)[influence_mask]
            
            influences[influence_mask] = (1 - (masked_distances / masked_radii)) * (1 + masked_boosts * 1.5)
            
            # Adjust influence by type
            influences[:, is_negative] *= 1.95
            influences[:, ~is_negative] *= 1.5
            influences *= influence_strengths
            
            # Calculate influenced colors
            strong_hues = hues[strong_indices]
            strong_intensities = sentiment_intensities[strong_indices]
            strong_sats = (0.6 + vowel_ratios[strong_indices] * 0.4) * strong_intensities
            strong_vals = 0.7 + lengths[strong_indices] * 0.3
            
            # Apply cluster boosts to strong colors
            cluster_boosts = 1 + similar_boosts * 1.5
            strong_sats = np.minimum(1.0, strong_sats * np.where(is_negative, 2.0, 1.95) * cluster_boosts)
            strong_vals = np.minimum(1.0, strong_vals * 1.85 * cluster_boosts)
            
            # Calculate weighted colors
            total_influences = np.sum(influences, axis=1)
            mask = total_influences > 0
            
            if np.any(mask):
                weighted_hues = np.sum(influences[mask] * strong_hues, axis=1) / total_influences[mask]
                weighted_sats = np.sum(influences[mask] * strong_sats, axis=1) / total_influences[mask]
                weighted_vals = np.sum(influences[mask] * strong_vals, axis=1) / total_influences[mask]
                
                # Calculate blend factors
                neg_influence = np.sum(influences[:, is_negative], axis=1)
                pos_influence = np.sum(influences[:, ~is_negative], axis=1)
                max_blends = np.where(neg_influence > pos_influence, 0.92, 0.88)
                blend_factors = np.minimum(total_influences * 1.8, max_blends)
                
                # Apply blending
                hues[batch_weak[mask]] = hues[batch_weak[mask]] * (1 - blend_factors[mask]) + weighted_hues * blend_factors[mask]
                saturations[batch_weak[mask]] = saturations[batch_weak[mask]] * (1 - blend_factors[mask]) + weighted_sats * blend_factors[mask]
                values[batch_weak[mask]] = values[batch_weak[mask]] * (1 - blend_factors[mask]) + weighted_vals * blend_factors[mask]
    
    # Process strong sentiment pixels
    if len(strong_indices) > 0:
        # Calculate cluster boosts for strong pixels
        strong_boosts = np.zeros(len(strong_indices))
        for i in range(len(strong_indices)):
            nearby = (strong_distances[i] < 3) & (strong_distances[i] > 0)
            same_type = sentiment_types == sentiment_types[i]
            strong_boosts[i] = np.sum(nearby & same_type) * 0.15
        
        cluster_boosts = 1 + strong_boosts
        
        # Apply boosts to strong pixels
        strong_sats = saturations[strong_indices]
        strong_vals = values[strong_indices]
        
        strong_sats = np.where(is_negative,
                             np.minimum(1.0, strong_sats * 1.4 * cluster_boosts),
                             np.minimum(1.0, strong_sats * 1.3 * cluster_boosts))
        strong_vals = np.where(is_negative,
                             np.minimum(1.0, strong_vals * 1.3 * cluster_boosts),
                             np.minimum(1.0, strong_vals * 1.25 * cluster_boosts))
        
        saturations[strong_indices] = strong_sats
        values[strong_indices] = strong_vals
    
    # Convert to RGB
    print("Converting to RGB...")
    hsv = np.stack((hues, saturations, values), axis=1)
    rgb = np.array([colorsys.hsv_to_rgb(*color) for color in tqdm(hsv, desc="Converting colors")])
    rgb = (rgb * 255).astype(np.uint8)
    
    # Create image
    img = Image.new('RGB', (width, height), color='black')
    pixels = img.load()
    
    print("Setting pixels...")
    for i in tqdm(range(total_pixels), desc="Setting pixels"):
        pixels[coords[i][0], coords[i][1]] = tuple(rgb[i])
    
    return img, width, height

def create_dual_feature_image(words, sentiments, word_features):
    """
    Create a visually interesting image using sentiment and word features.
    Each pixel's color is determined by multiple data points.
    """
    num_words = len(words)
    
    # Calculate dimensions for a square-like image
    width = math.ceil(math.sqrt(num_words))
    height = math.ceil(num_words / width)
    
    # Create a new RGB image
    img = Image.new('RGB', (width, height), color='black')
    pixels = img.load()
    
    for i in range(min(num_words, width * height)):
        x = i % width
        y = i // width
        
        sentiment = sentiments[i]
        features = word_features[i]
        word = words[i]
        
        # RED channel: Based on sentiment
        r = int(255 * (1 - sentiment))  # Negative sentiment = more red
        
        # GREEN channel: Based on word length 
        g = int(255 * features['length'])
        
        # BLUE channel: Based on vowel ratio
        b = int(255 * features['vowel_ratio'])
        
        # Apply a hash-based variation to add more visual diversity
        # while still keeping the data-driven approach
        r = (r + hash(word) % 30) % 256
        g = (g + hash(word[::-1]) % 30) % 256  # Use reversed word for different hash
        b = (b + hash(word + word) % 30) % 256  # Use doubled word for different hash
        
        pixels[x, y] = (r, g, b)
    
    return img, width, height

def create_pattern_image(words, sentiments, word_features):
    """Create an image with patterns based on word features."""
    num_words = len(words)
    
    # Use a larger grid to create more interesting patterns
    scale_factor = 5  # Each word gets a 5x5 grid of pixels
    
    # Calculate dimensions for a square-like image
    base_width = math.ceil(math.sqrt(num_words))
    base_height = math.ceil(num_words / base_width)
    
    width = base_width * scale_factor
    height = base_height * scale_factor
    
    # Create a new RGB image
    img = Image.new('RGB', (width, height), color='black')
    pixels = img.load()
    
    for i in range(min(num_words, base_width * base_height)):
        base_x = (i % base_width) * scale_factor
        base_y = (i // base_width) * scale_factor
        
        sentiment = sentiments[i]
        features = word_features[i]
        word = words[i]
        
        # Base color from sentiment
        base_color = sentiment_to_color(sentiment)
        
        # Calculate a secondary color based on word features
        secondary_color = word_to_color_hash(word, sentiment)
        
        # Fill the 5x5 grid with a pattern based on word features
        # Length determines pattern type
        pattern_type = int(features['length'] * 5)
        
        for dx in range(scale_factor):
            for dy in range(scale_factor):
                x = base_x + dx
                y = base_y + dy
                
                # Skip if out of bounds
                if x >= width or y >= height:
                    continue
                
                # Different patterns based on word characteristics
                if pattern_type == 0:
                    # Solid color
                    pixels[x, y] = base_color
                elif pattern_type == 1:
                    # Checkerboard
                    pixels[x, y] = base_color if (dx + dy) % 2 == 0 else secondary_color
                elif pattern_type == 2:
                    # Horizontal stripes
                    pixels[x, y] = base_color if dy % 2 == 0 else secondary_color
                elif pattern_type == 3:
                    # Vertical stripes
                    pixels[x, y] = base_color if dx % 2 == 0 else secondary_color
                elif pattern_type == 4:
                    # Diamond
                    pixels[x, y] = base_color if dx == dy or dx == (scale_factor - 1 - dy) or dx == scale_factor//2 or dy == scale_factor//2 else secondary_color
                else:
                    # Gradient
                    blend_factor = (dx + dy) / (2 * scale_factor)
                    r = int(base_color[0] * (1 - blend_factor) + secondary_color[0] * blend_factor)
                    g = int(base_color[1] * (1 - blend_factor) + secondary_color[1] * blend_factor)
                    b = int(base_color[2] * (1 - blend_factor) + secondary_color[2] * blend_factor)
                    pixels[x, y] = (r, g, b)
    
    return img, width, height

def create_legend():
    """Create a legend image showing the relationship between data and colors."""
    width = 400
    height = 200
    legend = Image.new('RGB', (width, height), color='white')
    pixels = legend.load()
    
    # Draw color spectrum
    for x in range(width):
        sentiment = x / (width - 1)  # 0 to 1
        color = sentiment_to_color(sentiment)
        for y in range(50):
            pixels[x, y] = color
    
    # Return the legend image
    return legend

def create_image_from_words(words, sentiments):
    """Create an image from words, with each word as a pixel colored by sentiment."""
    num_words = len(words)
    
    # Calculate dimensions for a square-like image
    width = math.ceil(math.sqrt(num_words))
    height = math.ceil(num_words / width)
    
    # Create a new RGB image
    img = Image.new('RGB', (width, height), color='black')
    pixels = img.load()
    
    # Fill the image with pixels
    for i in range(min(num_words, width * height)):
        x = i % width
        y = i // width
        pixels[x, y] = sentiment_to_color(sentiments[i])
    
    return img, width, height

def create_collapsed_sentiment_image(words, sentiments, word_features):
    """Create an image where neutral pixels are completely removed, leaving only colored pixels packed together."""
    # First, create the standard visualization with bleeding effects
    img, width, height = create_multi_feature_image(words, sentiments, word_features)
    pixels = img.load()
    
    # Convert pixels to HSV and collect non-neutral pixels
    kept_pixels = []
    NEUTRAL_THRESHOLD = 0.2  # Threshold for saturation to consider neutral
    
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            if s >= NEUTRAL_THRESHOLD:  # Keep only non-neutral pixels
                kept_pixels.append((r, g, b))
    
    # Calculate new dimensions for a roughly square image
    num_kept = len(kept_pixels)
    new_width = math.ceil(math.sqrt(num_kept))
    new_height = math.ceil(num_kept / new_width)
    
    # Create new image with just the kept pixels
    new_img = Image.new('RGB', (new_width, new_height), color='black')
    new_pixels = new_img.load()
    
    # Fill in the kept pixels in order
    for i, color in enumerate(kept_pixels):
        x = i % new_width
        y = i // new_width
        new_pixels[x, y] = color
    
    removed_pixels = width * height - num_kept
    print(f"Removed {removed_pixels} neutral pixels, new size: {new_width}x{new_height}")
    
    return new_img, new_width, new_height

def create_word_length_image(words, sentiments, word_features):
    """Create an image where each word is represented by N pixels of the same color, where N is the word length."""
    # Calculate total space needed (cap individual word length at 10)
    total_length = sum(min(len(word), 10) for word in words)
    width = math.ceil(math.sqrt(total_length))
    height = width
    total_pixels = width * height
    
    # Pre-allocate arrays
    expanded_words = []
    expanded_sentiments = []
    expanded_features = []
    
    print("Creating length-based representation...")
    current_idx = 0
    
    # Get base colors from standard visualization method
    base_img, _, _ = create_multi_feature_image(words, sentiments, word_features)
    base_pixels = base_img.load()
    base_width = math.ceil(math.sqrt(len(words)))
    
    # Process each word
    for i, word in enumerate(words):
        if current_idx >= total_pixels:
            break
            
        # Get the word's color from the base visualization
        base_x = i % base_width
        base_y = i // base_width
        word_color = base_pixels[base_x, base_y]
        
        # Add N pixels of the same color, where N is the word length
        word_len = min(len(word), 10)  # Cap word length at 10
        if current_idx + word_len > total_pixels:
            break
            
        # Add the word N times with its color
        expanded_words.extend([word] * word_len)
        expanded_sentiments.extend([sentiments[i]] * word_len)
        expanded_features.extend([word_features[i]] * word_len)
        current_idx += word_len
    
    # Create the final image
    img = Image.new('RGB', (width, height), color='black')
    pixels = img.load()
    
    # Fill pixels with colors
    for i in range(len(expanded_words)):
        x = i % width
        y = i // width
        base_idx = words.index(expanded_words[i])
        base_x = base_idx % base_width
        base_y = base_idx // base_width
        pixels[x, y] = base_pixels[base_x, base_y]
    
    return img, width, height

def main():
    print("Starting text-to-image conversion...")
    
    # Load and process text
    try:
        text = load_text('text.txt')
        print(f"Loaded text with {len(text)} characters")
        
        words = preprocess_text(text)
        print(f"Extracted {len(words)} words")
        
        # Analyze sentiment
        sentiments, raw_scores = analyze_sentiment(words)
        
        # Create version with unique sentiments for neutral words
        unique_sentiments = unique_sentiment_assignment(words, sentiments)
        enhanced_unique_sentiments = enhance_sentiment_diversity(unique_sentiments)
        
        print("Sentiment analysis complete")
        
        # Analyze word features
        original_features = analyze_word_features(words)
        print("Word feature analysis complete")
        
        print("\nCreating visualizations...")
        
        # 1. Standard multi-feature visualization
        print("\nCreating standard visualization...")
        img1, width1, height1 = create_multi_feature_image(words, enhanced_unique_sentiments, original_features)
        img1 = img1.resize((width1 * 20, height1 * 20), Image.Resampling.NEAREST)
        img1.save('standard_visualization.png')
        
        # 2. Collapsed sentiment visualization
        print("\nCreating collapsed sentiment visualization...")
        img2, width2, height2 = create_collapsed_sentiment_image(words, enhanced_unique_sentiments, original_features)
        img2 = img2.resize((width2 * 20, height2 * 20), Image.Resampling.NEAREST)
        img2.save('collapsed_visualization.png')
        
        print("\nVisualizations created:")
        print("1. Standard visualization (standard_visualization.png)")
        print("2. Collapsed sentiment visualization (collapsed_visualization.png)")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main() 