/* Login-only language preference. Never modifies studio data or auth configuration. */
(()=>{
 const copy={
  es:{language:'Idioma del acceso',panel:'Inicio de sesión',email:'Correo electrónico',password:'Contraseña',forgot:'¿La has olvidado?',passwordHint:'Tu contraseña',enter:'Entrar',newAccount:'¿Todavía no tienes cuenta?',signup:'Crear cuenta',or:'o continúa con',google:'Continuar con Google',apple:'Continuar con Apple'},
  en:{language:'Sign-in language',panel:'Sign in',email:'Email address',password:'Password',forgot:'Forgot password?',passwordHint:'Your password',enter:'Sign in',newAccount:'Don’t have an account?',signup:'Create account',or:'or continue with',google:'Continue with Google',apple:'Continue with Apple'},
  fr:{language:'Langue de connexion',panel:'Connexion',email:'Adresse e-mail',password:'Mot de passe',forgot:'Mot de passe oublié ?',passwordHint:'Votre mot de passe',enter:'Se connecter',newAccount:'Vous n’avez pas encore de compte ?',signup:'Créer un compte',or:'ou continuer avec',google:'Continuer avec Google',apple:'Continuer avec Apple'},
  it:{language:'Lingua di accesso',panel:'Accedi',email:'Indirizzo email',password:'Password',forgot:'Password dimenticata?',passwordHint:'La tua password',enter:'Accedi',newAccount:'Non hai ancora un account?',signup:'Crea account',or:'oppure continua con',google:'Continua con Google',apple:'Continua con Apple'},
  pt:{language:'Idioma de acesso',panel:'Iniciar sessão',email:'Endereço de email',password:'Palavra-passe',forgot:'Esqueceu-se da palavra-passe?',passwordHint:'A sua palavra-passe',enter:'Entrar',newAccount:'Ainda não tem conta?',signup:'Criar conta',or:'ou continuar com',google:'Continuar com Google',apple:'Continuar com Apple'}
 };
 function boot(){
  const root=document.getElementById('loginScreen'),select=document.getElementById('login-language');if(!root||!select)return;
  const enterButton=document.getElementById('lg-mail'),arrow=enterButton.querySelector('svg')?.cloneNode(true);
  const key=(typeof LS_KEY==='string'?LS_KEY:'moderno')+':login-language';let language='es';
  try{const saved=localStorage.getItem(key);if(Object.hasOwn(copy,saved))language=saved;}catch(e){}
  function paint(){
   const c=copy[language];root.lang=language;select.value=language;select.setAttribute('aria-label',c.language);select.title=c.language;
   root.querySelector('.studio-login-panel').setAttribute('aria-label',c.panel);
   root.querySelectorAll('[data-login-copy]').forEach(el=>{const text=c[el.dataset.loginCopy];if(text&&el.textContent!==text)el.textContent=text;});
   const pass=document.getElementById('lgPass');if(pass.placeholder!==c.passwordHint)pass.placeholder=c.passwordHint;
   // Existing password handler replaces its button text after a failed attempt.
   if(!enterButton.disabled&&!enterButton.querySelector('[data-login-copy=enter]')){const label=document.createElement('span');label.dataset.loginCopy='enter';label.textContent=c.enter;enterButton.replaceChildren(label);if(arrow)enterButton.append(arrow.cloneNode(true));}
  }
  select.addEventListener('change',()=>{if(!Object.hasOwn(copy,select.value))return;language=select.value;try{localStorage.setItem(key,language);}catch(e){}paint();});
  new MutationObserver(paint).observe(document.getElementById('lg-mail'),{childList:true});paint();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
