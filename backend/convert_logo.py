import base64

with open('static_images/logo.jpeg', 'rb') as f:
    logo_data = base64.b64encode(f.read()).decode()
    print('data:image/jpeg;base64,' + logo_data)
