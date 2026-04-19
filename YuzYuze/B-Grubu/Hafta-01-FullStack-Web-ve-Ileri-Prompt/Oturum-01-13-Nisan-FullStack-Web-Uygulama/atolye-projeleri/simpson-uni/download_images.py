import urllib.request
import os

os.chdir(os.path.join(os.path.dirname(__file__), 'images'))

images = {
    'bart.png': 'https://static.wikia.nocookie.net/simpsons/images/0/0a/Profile_-_Bart_Simpson.png/revision/latest/scale-to-width-down/200?cb=20250301184943',
}

for name, url in images.items():
    try:
        req = urllib.request.Request(url, headers={
            'Referer': 'https://simpsons.fandom.com/',
            'User-Agent': 'Mozilla/5.0'
        })
        data = urllib.request.urlopen(req).read()
        with open(name, 'wb') as f:
            f.write(data)
        print(f'OK: {name} ({len(data)} bytes)')
    except Exception as e:
        print(f'FAIL: {name} - {e}')
