// =====================================================================
//  middleware/auth.js – verificarea autentificării și a rolurilor
//  Roluri (tabela "roluri"): Client, Angajat, Administrator
// =====================================================================

// Pagina se poate deschide doar dacă utilizatorul este logat
function necesitaLogin(req, res, next) {
  if (req.session.user) return next();
  req.session.flash = { tip: 'eroare', text: 'Trebuie să te autentifici pentru a continua.' };
  req.session.dupaLogin = req.originalUrl;          // după login îl trimitem înapoi aici
  res.redirect('/login');
}

// Pagina se poate deschide doar de anumite roluri, ex: necesitaRol('Angajat', 'Administrator')
function necesitaRol(...roluri) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) return necesitaLogin(req, res, next);
    if (roluri.includes(user.rol)) return next();
    res.status(403).render('eroare', {
      titlu: 'Acces interzis',
      mesaj: `Această pagină este disponibilă doar pentru: ${roluri.join(', ')}.`,
    });
  };
}

module.exports = { necesitaLogin, necesitaRol };
