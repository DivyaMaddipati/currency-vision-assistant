def calculate_distance(height: float) -> float:
    # Constants for distance calculation (you may need to adjust these)
    KNOWN_HEIGHT = 1.7  # Average person height in meters
    FOCAL_LENGTH = 615  # Camera focal length (needs calibration)
    
    # Calculate distance using triangle similarity
    distance = (KNOWN_HEIGHT * FOCAL_LENGTH) / height
    return distance