const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'inventory.db');

function initDatabase() {
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'kpl',
      price REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const count = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (count.count === 0) {
    const insert = db.prepare(`
      INSERT INTO products (name, category, description, quantity, unit, price)
      VALUES (@name, @category, @description, @quantity, @unit, @price)
    `);

    const products = [
      {
        name: 'Shimano Catana 270 Heittovapa',
        category: 'Vavat',
        description: 'Laadukas heittovapa lohelle ja hauelle. Pituus 270 cm, heittopallo 20-60 g.',
        quantity: 8,
        unit: 'kpl',
        price: 49.90
      },
      {
        name: 'Daiwa Crossfire 200 Kelaus',
        category: 'Kelat',
        description: 'Monipuolinen spinningkelaus kaikenlaiseen kalastukseen. Tilavuus 200 m / 0.30 mm.',
        quantity: 12,
        unit: 'kpl',
        price: 34.95
      },
      {
        name: 'Rapala Original Floating 9 cm',
        category: 'Virveli',
        description: 'Klassinen Rapala-uistin. Sopii ahvenelle, hauuelle ja taimenelle. Väri: kultainen.',
        quantity: 25,
        unit: 'kpl',
        price: 12.50
      },
      {
        name: 'Abu Garcia Droppen 18 g',
        category: 'Lusikka',
        description: 'Tehokas lohilusikka virtaavaan veteen. Paino 18 g, väri: hopea/punainen.',
        quantity: 30,
        unit: 'kpl',
        price: 8.90
      },
      {
        name: 'Berkley Trilene XT 0.30 mm 300 m',
        category: 'Siima',
        description: 'Korkealaatuinen monofilamenttivaijeri. Erittäin kestävä ja vähän muistia.',
        quantity: 15,
        unit: 'rulla',
        price: 14.95
      },
      {
        name: 'Mustad Hauki 3x Treble Hook 2/0',
        category: 'Koukut',
        description: 'Vahva kolmoiskoukku hauelle. Koko 2/0, teräväkärkinen ja pitkäikäinen.',
        quantity: 100,
        unit: 'kpl',
        price: 1.50
      },
      {
        name: 'Suomusmäki Pilkkivapa 60 cm',
        category: 'Pilkkivälineet',
        description: 'Perinteinen suomalainen pilkkivapa. Pituus 60 cm, erittäin herkkä täristelijä.',
        quantity: 20,
        unit: 'kpl',
        price: 18.00
      },
      {
        name: 'Normark Hauki Verkko 60 m',
        category: 'Verkot',
        description: 'Ammattilaatua hauki verkko. Korkeus 1.8 m, silmäkoko 55 mm.',
        quantity: 5,
        unit: 'kpl',
        price: 89.00
      },
      {
        name: 'Fladen Perhovapa 4-osainen 9\' #7',
        category: 'Vavat',
        description: 'Laadukkas perhovapa matkailuun. 4-osainen, koko #7, sopii järveen ja jokeen.',
        quantity: 6,
        unit: 'kpl',
        price: 79.90
      },
      {
        name: 'Rio InTouch Gold Perhonsiima #7',
        category: 'Siima',
        description: 'Premium WF-7-F perhonsiima. Helppo heittää, sopii kaikenlaiseen perhokalastukseen.',
        quantity: 10,
        unit: 'kpl',
        price: 59.95
      },
      {
        name: 'Muddler Minnow #8 (kotitekoinen)',
        category: 'Perhokalastus',
        description: 'Klassiinen streameriperho taimenelle ja kirjolohelle. Sidottu käsin, hirenkarvainen.',
        quantity: 40,
        unit: 'kpl',
        price: 2.50
      },
      {
        name: 'Plastex Matojäähdytyslaatikko 2 L',
        category: 'Syötit',
        description: 'Pitää kastematot elävinä pitkään. Tuuletusaukot, helppo kuljettaa.',
        quantity: 18,
        unit: 'kpl',
        price: 9.90
      },
      {
        name: 'Kuusamo Toppen 17 g',
        category: 'Lusikka',
        description: 'Suomalainen klassikkolusikka. Paino 17 g, erittäin tehokas hauulle ja ahvenelle.',
        quantity: 35,
        unit: 'kpl',
        price: 7.50
      },
      {
        name: 'Abu Garcia Reflex 14 g',
        category: 'Virveli',
        description: 'Monikäyttöinen pyörivävieheinen jigi. Paino 14 g, väri: vihreä/hopea.',
        quantity: 22,
        unit: 'kpl',
        price: 6.95
      },
      {
        name: 'Katiska Muovinen Ø 60 cm',
        category: 'Pyydykset',
        description: 'Kestävä muovinen katiska ahvenelle ja lahnalle. Halkaisija 60 cm, syvyys 80 cm.',
        quantity: 7,
        unit: 'kpl',
        price: 24.90
      },
      {
        name: 'Plano Taktiikkalaukku 3500',
        category: 'Tarvikkeet',
        description: 'Selkeäosastoinen vieheboksi. 4 tasetta, sopii 3500-kokoisiin komponentteihin.',
        quantity: 14,
        unit: 'kpl',
        price: 19.95
      },
      {
        name: 'Helin Poika 11 g - Kulta',
        category: 'Lusikka',
        description: 'Kotimaiseen järvikalastukseen suunniteltu lusikka. 11 g, kultainen pinta.',
        quantity: 28,
        unit: 'kpl',
        price: 6.50
      },
      {
        name: 'Rapala VMC Jighead 7 g 4/0',
        category: 'Koukut',
        description: 'Painokoukku softbait-vieheille. Paino 7 g, koko 4/0, erittäin terävä.',
        quantity: 50,
        unit: 'kpl',
        price: 1.90
      },
      {
        name: 'Garmin Striker 4 Kaikuluotain',
        category: 'Elektroniikka',
        description: 'Kompakti GPS-kaikuluotain. Näyttö 3.5", ClearVü-tekniikka, vesitiivis.',
        quantity: 3,
        unit: 'kpl',
        price: 149.00
      },
      {
        name: 'Neopreeni Kahluuhousut L',
        category: 'Varusteet',
        description: 'Laadukas 5 mm neopreniset kahluuhousut perhokalastajalle. Koko L, joustava.',
        quantity: 4,
        unit: 'kpl',
        price: 119.00
      }
    ];

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insert.run(item);
      }
    });
    insertMany(products);
    console.log('Database initialized with 20 sample products.');
  }

  return db;
}

module.exports = { initDatabase };
