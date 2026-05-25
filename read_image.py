from PIL import Image
import pytesseract
img = Image.open('image.png')
text = pytesseract.image_to_string(img)
print(text)
