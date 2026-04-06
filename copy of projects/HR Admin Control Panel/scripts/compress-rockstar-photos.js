/**
 * Compresses rockstar photos to base64 JPEG thumbnails for Firestore storage.
 * Run: node scripts/compress-rockstar-photos.js
 * Output: packages/admin/src/data/rockstar-seed.json
 */
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const ROCKSTARS_DIR = path.resolve(__dirname, '../RCO Rockstars');
const OUTPUT = path.resolve(__dirname, '../packages/admin/src/data/rockstar-seed.json');

const MAX_SIZE = 300;

const EMPLOYEES = [
  { name: 'Kyle Longest', title: 'Production Specialist', tenure: '4 months', month: 'January', quote: 'I admire how Rowe Casa puts God above business and money. I like how Rowe Casa cares about its employees. I also like how Rowe Casa listens to its employees and follows through with employee ideas on making things better.', initials: 'KL', img: 'kylelongest.jpg' },
  { name: 'Derric Watson', title: 'Kitchen Supervisor', tenure: '1 year, 4 months', month: 'January', quote: "The teammates and the camaraderie are what make working at Rowe Casa special. There's never a dull moment working with the great group of people I see daily.", initials: 'DW', img: 'derricwatson.png' },
  { name: 'Marcus Griffin', title: 'Warehouse Inventory Associate', tenure: '1 year', month: 'January', quote: '"Choose to be optimistic and have a positive outlook regardless of the circumstance."<br><br>What he likes best working at Rowe Casa Organics are the amazing people he has met throughout his time here and the work environment.', initials: 'MG', img: 'marcusgriffin.jpg' },
  { name: 'Jacob Schooley', title: 'Quality Assurance Specialist', tenure: '1 year, 3 months', month: 'February', quote: 'I enjoy the people and the vibe. I went through a personal matter and received nothing but support from my supervisors and my Rowe Casa family. This hammered in loyalty from the start. I also appreciate the opportunities that I have been given and the opportunities to grow within Rowe Casa.', initials: 'JS', img: 'jacobschooly.png' },
  { name: 'Hillary Kemp', title: 'Quality Assurance Specialist', tenure: '2 years, 5 months', month: 'February', quote: '"Quality means doing it right when no one is looking." — Henry Ford<br><br>I like my job because it allows me to solve problems, ensure quality standards are met, and contributes to improving processes. It\'s rewarding to know the work I do helps maintain product quality and supports the team!', initials: 'HK', img: 'hillarykemp.png' },
  { name: 'Terri Longest', title: 'Shipping Specialist', tenure: '1 year, 4 months', month: 'February', quote: 'Rowe Casa Organics provides great opportunities for learning and advancement. I enjoy working for this family-oriented company. Their professional staff is the best I have ever worked for.', initials: 'TL', img: 'terrilongest.png' },
  { name: 'Andrea Munoz', title: 'Quality Assurance Supervisor', tenure: '5 years', month: 'February', quote: 'I have never worked somewhere that has allowed me to grow like Rowe Casa has. I am grateful for the opportunity to be here.', initials: 'AM', img: 'andreamunoz.jpg' },
  { name: 'Elijah Miller', title: 'QA Specialist', tenure: '', month: 'March', quote: 'I am pleased to be part of the quality assurance team and ensure we are putting out our best. From catching errors and contamination to finding ways to streamline and improve the processes in any way, I am dedicated to the overall quality and everyone that I work with each day.', initials: 'EM', img: 'elijah.png' },
  { name: 'Kim Eubank', title: 'Production Supervisor', tenure: '', month: 'March', quote: "It is an honor to work with and for such incredible people here at Rowe Casa Organics. It's like my home away from home. I love how we not only create goals but also achieve them everyday. I believe in the people here and the future of this brand.", initials: 'KE', img: 'kim.png' },
  { name: 'Megan Escobedo', title: 'Curing Specialist', tenure: '', month: 'March', quote: 'Working at Rowe Casa means so much more to me than just showing up and getting tasks done—it means being part of something meaningful, where everyday brings a chance to grow, connect and make a difference in ways big and small.', initials: 'ME', img: 'megan.png' },
];

async function compress(filePath) {
  const img = await loadImage(filePath);
  let { width, height } = img;

  if (width > height) {
    if (width > MAX_SIZE) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
  } else {
    if (height > MAX_SIZE) { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
  }

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const buffer = canvas.toBuffer('image/jpeg', 70);
  return 'data:image/jpeg;base64,' + buffer.toString('base64');
}

async function main() {
  const results = [];

  for (const emp of EMPLOYEES) {
    const filePath = path.join(ROCKSTARS_DIR, emp.img);
    let photoUrl = null;

    if (fs.existsSync(filePath)) {
      console.log(`Compressing ${emp.img}...`);
      photoUrl = await compress(filePath);
      const sizeKB = Math.round(photoUrl.length / 1024);
      console.log(`  → ${sizeKB} KB base64`);
    } else {
      console.log(`MISSING: ${emp.img}`);
    }

    const [firstName, ...rest] = emp.name.split(' ');
    const lastName = rest.join(' ');

    results.push({
      firstName,
      lastName,
      displayName: emp.name,
      department: emp.title,
      initials: emp.initials,
      tenure: emp.tenure,
      month: emp.month,
      quote: emp.quote,
      photoUrl,
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${results.length} entries to ${OUTPUT}`);
}

main().catch(console.error);
