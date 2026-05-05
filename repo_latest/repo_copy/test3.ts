import axios from 'axios';

async function run() {
  try {
    const res = await axios.get('http://localhost:3000/');
    console.log('Status:', res.status);
  } catch (e: any) {
    console.error(e.message);
  }
}
run();
