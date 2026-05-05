import axios from 'axios';

async function run() {
  try {
    const keysRes = await axios.post('http://localhost:3000/api/keys/generate');
    const { public_key, private_key } = keysRes.data;
    
    console.log('Keys generated');

    const seedsRes = await axios.get('http://localhost:3000/api/seeds');
    const seed = seedsRes.data[0];
    
    if (!seed) {
      console.log('No seeds found');
      return;
    }

    const signRes = await axios.post(`http://localhost:3000/api/seeds/${seed.id}/sign`, { private_key });
    console.log('Sign result:', signRes.data);

    const verifyRes = await axios.post(`http://localhost:3000/api/seeds/${seed.id}/verify`, { public_key });
    console.log('Verify result:', verifyRes.data);

  } catch (e: any) {
    console.error(e.response?.data || e.message);
  }
}
run();
