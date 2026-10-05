// sign-in form: post the details, then go to the budget
const form = document.getElementById('login'), msg = document.getElementById('msg');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button');
  btn.disabled = true; msg.hidden = true;
  try {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ynabb' },
      body: JSON.stringify({ username: form.username.value, password: form.password.value }),
    });
    if (r.ok) { location.replace('/'); return; }
    const j = await r.json().catch(() => ({}));
    msg.textContent = j.error || 'Could not sign in. Try again.';
  } catch (err) {
    msg.textContent = "Can't reach YNABB. Check your internet connection.";
  }
  msg.hidden = false;
  btn.disabled = false;
  form.password.select();
});
