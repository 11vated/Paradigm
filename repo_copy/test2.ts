import axios from 'axios';

async function run() {
  try {
    const res = await axios.post('http://localhost:3000/api/seeds/generate', {
      prompt: 'a fiery dragon',
      domain: 'creature'
    });
    console.log('Generated:', res.data);
    
    const id = res.data.id;
    const growRes = await axios.post(`http://localhost:3000/api/seeds/${id}/grow`);
    console.log('Grown:', growRes.data);
  } catch (e: any) {
    console.error(e.message);
  }
}
run();
