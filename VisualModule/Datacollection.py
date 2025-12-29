import cv2
from cvzone.HandTrackingModule import HandDetector
import numpy as np
import math
import time
import os


cap = cv2.VideoCapture(0)
detector = HandDetector(maxHands=1)
offset = 20
imgSize = 300
counter = 0


folder = r"D:\Desktop\sign final pro\Data\Pump"
os.makedirs(folder, exist_ok=True)

try:
    while True:
        success, img = cap.read()
        if not success:
            print("❌ Failed to capture image from camera.")
            break

        hands, img = detector.findHands(img)
        if hands:
            hand = hands[0]
            x, y, w, h = hand['bbox']

            imgWhite = np.ones((imgSize, imgSize, 3), np.uint8) * 255

            w
            y1 = max(0, y - offset)
            y2 = min(img.shape[0], y + h + offset)
            x1 = max(0, x - offset)
            x2 = min(img.shape[1], x + w + offset)

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

                cv2.imshow('ImageCrop', imgCrop)
                cv2.imshow('ImageWhite', imgWhite)

                
                counter += 1
                file_path = f"{folder}/Image_{time.time()}.jpg"
                cv2.imwrite(file_path, imgWhite)
                print(f"✅ Saved: {file_path} | Count: {counter}")

       
        cv2.imshow('Image', img)

        
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

except KeyboardInterrupt:
    print("🛑 Program stopped manually.")

finally:
    cap.release()
    cv2.destroyAllWindows()
