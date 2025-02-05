def calculate_distance(box_height: float, real_height: float = 1.7) -> float:
    # Focal length (you may need to calibrate this for your camera)
    focal_length = 615
    return (real_height * focal_length) / box_height