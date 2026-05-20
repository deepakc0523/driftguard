// test-fix1.js
const axios = require('axios');

async function test() {
  try {
    // 0. Register first
    await axios.post('http://localhost:5000/api/auth/register', {
      email: 'admin@driftguard.io',
      password: 'adminpassword'
    }).catch(e => console.log('User might already exist'));

    // 1. Login to get token
    const { data: auth } = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@driftguard.io',
      password: 'adminpassword'
    });
    const token = auth.token;

    // 2. Mock PCID sign request
    const payload = {
      repoId: '65fcc9c2d1d2b3c4e5f6a7b8', // mock id
      commitSHA: 'test-sha',
      files: {
        'config/app.json': JSON.stringify({ "database": { "port": 5432 } })
      }
    };

    const { data: pcid } = await axios.post('http://localhost:5000/api/pcid/sign', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ PCID sign test passed:', pcid);
  } catch (err) {
    console.error('❌ PCID sign test failed:', err.response?.data || err.message);
  }
}

test();
