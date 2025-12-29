import cv2
from cvzone.HandTrackingModule import HandDetector
from cvzone.ClassificationModule import Classifier
import numpy as np
import math
from collections import Counter
import time

# ---- Setup ----
cap = cv2.VideoCapture(0)
detector = HandDetector(maxHands=1)

classifier = Classifier(
    r"D:\Downloads\converted_keras(3)\keras_model.h5",
    r"D:\Downloads\converted_keras(3)\labels.txt"
)

offset = 20
imgSize = 300

# Load labels
with open(r"D:\Downloads\converted_keras(3)\labels.txt", "r") as f:
    labels = [line.strip() for line in f.readlines()]
print("Labels loaded:", labels)

# Map classifier index to desired output numbers
index_to_number = {0: 0, 1: 2, 2: 4}  # Light=0, Fan=2, Pump=4

# Map classifier index to action names
index_to_name = {0: "Light", 1: "Fan", 2: "Pump"}

predictions = []

# Fullscreen window
cv2.namedWindow("Image", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("Image", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

# Timer
duration = 10  # seconds
start_time = time.time()
print(f"Capturing hand gestures for {duration} seconds...")

while time.time() - start_time < duration:
    success, img = cap.read()
    if not success:
        continue

    imgOutput = img.copy()
    hands, _ = detector.findHands(img)

    if hands:
        hand = hands[0]
        x, y, w, h = hand['bbox']

        imgWhite = np.ones((imgSize, imgSize, 3), np.uint8) * 255

        # Safe crop
        y1, y2 = max(0, y - offset), min(img.shape[0], y + h + offset)
        x1, x2 = max(0, x - offset), min(img.shape[1], x + w + offset)
        imgCrop = img[y1:y2, x1:x2]

        if imgCrop.size != 0:
            aspectRatio = h / w
            if aspectRatio > 1:
                k = imgSize / h
                wCal = math.ceil(k * w)
                imgResize = cv2.resize(imgCrop, (wCal, imgSize))
                wGap = math.ceil((imgSize - wCal) / 2)
                imgWhite[:, wGap:wCal + wGap] = imgResize
            else:
                k = imgSize / w
                hCal = math.ceil(k * h)
                imgResize = cv2.resize(imgCrop, (imgSize, hCal))
                hGap = math.ceil((imgSize - hCal) / 2)
                imgWhite[hGap:hCal + hGap, :] = imgResize

            # Prediction
            prediction, index = classifier.getPrediction(imgWhite, draw=False)
            action_name = index_to_name.get(index, "Unknown")
            action_number = index_to_number.get(index, -1)

            # Show live action name
            cv2.putText(imgOutput, action_name, (x, y - 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 3)
            cv2.rectangle(imgOutput, (x - offset, y - offset),
                          (x + w + offset, y + h + offset), (0, 255, 0), 4)

            # Store number for final output
            if action_number != -1:
                predictions.append(action_number)

    cv2.imshow("Image", imgOutput)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()

# Final prediction as number
if predictions:
    final_prediction = Counter(predictions).most_common(1)[0][0]
    print(final_prediction)  # 0, 2, or 4
else:
    print("No hand detected.")
