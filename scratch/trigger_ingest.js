fetch('http://localhost:3001/api/demo/ingest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ filename: 'test.pdf' })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
