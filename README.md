# MADAM — Making A Difference, Always Magnificent

A student advocacy website on **gender equality**. It narrates collective identity and promotes awareness and activism.

## Pages

| File | Page | What's on it |
|---|---|---|
| `index.html` | Home | A **circle of eight people** with different identities: hover (or tap) and they all reach in to join hands in the middle and break into smiles; click for a little cheer; the numbers; links to each page; and at the bottom, the **Safe Space / Freedom Wall**: "Add a note" opens a sticky note in a modal (text, feeling, paper and pin color), then you drag it anywhere on the wall and pin it. Click a note to read it and leave support. |
| `about.html` | About | Group photo in a paper frame, the meaning of the name (from Maxime, Andrian, Dionne, Amiel, Mikylla), member testimonials, who it's for |
| `issue.html` | The Issue | Inspired by the UN Gender Equality page: why it matters, six key numbers, six areas for change, a timeline (1945–2025), awareness days, and myth vs. fact |
| `resources.html` | Resources | PH hotlines, organizations, reading list |
| `safespace.html` | (redirect) | Old link; forwards to the wall on the home page |

## Folder structure

```
MADAM/
├── *.html               the 4 pages (+ safespace.html redirect)
├── css/style.css        all styling (warm palette: sun, coral, teal, berry; variables at the top)
├── js/main.js           shared nav, footer, scroll reveals, toast
├── js/hero.js           the "hands in" circle of people on the home page
├── js/store.js          data layer (Firebase or local fallback)
├── js/firebase-config.js  ← paste your Firebase keys here
├── js/safespace.js      Safe Space wall logic
├── js/filter.js         offensive-word filter for the wall
└── assets/              logo.svg (thin line), logo-light.svg, favicons
```

## Running it

Open `index.html` in a browser. That's it.
For best results (and for Firebase to work reliably), run a tiny local server from this folder:

```
python -m http.server 8000
```

then visit http://localhost:8000. Or use the **Live Server** extension in VS Code.

## Making the Safe Space wall public (Firebase, free)

Until you do this, the site runs in **demo mode**: notes are saved only in the visitor's own browser.

1. Go to https://console.firebase.google.com and click **Add project** (name it `madam`). Google Analytics can be turned off.
2. In the left menu: **Build → Firestore Database → Create database**. Pick a location near you (e.g. `asia-southeast1`), start in **production mode**.
3. Open the **Rules** tab, replace everything with the rules below, and click **Publish**.
4. Go to **Project settings (⚙️) → General → Your apps → Web (`</>`)**. Register an app (no hosting needed). Copy the `firebaseConfig` values.
5. Paste those values into `js/firebase-config.js`.
6. Reload the home page. The "Demo mode" notice disappears and notes are now shared with everyone.

> The Firebase web API key is meant to be public; the security rules below are what protect your data.

### Firestore security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /notes/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['text', 'mood', 'paper', 'pin', 'x', 'y', 'reacts', 'createdAt'])
        && request.resource.data.x is int && request.resource.data.x >= 0 && request.resource.data.x <= 1200
        && request.resource.data.y is int && request.resource.data.y >= 0 && request.resource.data.y <= 800
        && request.resource.data.text is string
        && request.resource.data.text.size() >= 3
        && request.resource.data.text.size() <= 300
        && request.resource.data.mood in ['happy', 'empowered', 'hopeful', 'grateful', 'sad', 'angry', 'anxious', 'tired']
        && request.resource.data.paper in ['yellow', 'pink', 'mint', 'sky', 'lavender', 'peach', 'white']
        && request.resource.data.pin in ['red', 'blue', 'green', 'yellow', 'purple', 'black']
        && request.resource.data.createdAt == request.time;
      // visitors may only add reactions, nothing else
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reacts']);
      allow delete: if false;
    }
  }
}
```

### Moderating the wall

Harmful notes can be deleted from **Firebase console → Firestore Database → notes**: click the note, then **Delete document**.
The site also has built-in filters (in `js/safespace.js`):
- `js/filter.js`: blocks notes with swear words, slurs or sexual insults in English and Filipino, including disguised spellings (f*ck, sh1t, fuuuck, f u c k, tang ina). Blocked notes can't be pinned, and any that reach the database are hidden from the wall. Add words to its lists as needed.
- `PERSONAL_INFO`: blocks phone numbers, emails, links and @handles to keep people anonymous
- `CRISIS_WORDS`: if a note mentions self-harm or abuse, a gentle message with hotlines appears
- a 30-second cooldown between notes

## Publishing online (free)

- **Netlify:** drag the `MADAM` folder onto https://app.netlify.com/drop
- **GitHub Pages:** push this folder to a GitHub repo → Settings → Pages → deploy from `main`.

## Before submitting — please double-check

- **Statistics and sources** on Home and The Issue reflect widely cited figures (WEF, WHO, IPU, UN Women, UNICEF). Check them against the latest reports and add exact citations if your teacher requires them.
- **Hotline numbers** on the Resources page: verify they are still current.

## Photos

- **Group photo:** save it as `assets/team.jpg` (landscape, 4:3 looks best). Until then, the About page shows a placeholder inside the frame.
- **Member photos:** portrait (4:5, about 640 × 800) photos in `assets/maxime.jpg`, `assets/andrian.jpg`, `assets/dionne.jpg`, `assets/amiel.jpg`, `assets/mikylla.jpg`. If one is missing, that card shows a colour block with the member's initial.
