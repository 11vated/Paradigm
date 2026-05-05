import axios from 'axios';

async function run() {
  try {
    const res = await axios.post('http://localhost:3000/api/gspl/execute', {
      source: `
        seed "Test Seed" in character {
          strength: 0.5
        }
      `
    });
    console.log('Execute:', res.data);
  } catch (e: any) {
    console.error(e.message);
  }
}
run();
