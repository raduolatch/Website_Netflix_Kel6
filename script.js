(() => {
    const $ = (id) => document.getElementById(id);

    const KEY = "netplik_user";
    const HOME = "home.html";

    // ---------- Penyimpanan user ----------
    function getUser() {
        try {
            return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY));
        } catch {
            return null;
        }
    }

    function saveUser(user, remember) {
        try {
            (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(user));
        } catch { }
    }

    // Kalau sudah login, langsung ke home
    if (getUser()) {
        window.location.replace(HOME);
        return;
    }

    // ---------- Elemen ----------
    const el = {
        heroForm: $("hero-form"),
        heroEmail: $("email"),
        title: $("auth-title"),
        form: $("auth-form"),
        email: $("login-email"),
        pass: $("login-pass"),
        remember: $("remember"),
        rememberWrap: $("remember-wrap"),
        error: $("auth-error"),
        submit: $("auth-submit"),
        switchText: $("switch-text"),
        switchBtn: $("switch-mode"),
    };

    let mode = "login";

    function showError(msg) {
        el.error.textContent = msg;
        el.error.classList.toggle("hidden", !msg);
    }

    function setMode(next) {
        mode = next;
        const reg = mode === "register";
        el.title.textContent = reg ? "Daftar" : "Sign In";
        el.submit.textContent = reg ? "Buat Akun" : "Sign In";
        el.switchText.textContent = reg ? "Sudah punya akun?" : "Baru di Netplik?";
        el.switchBtn.textContent = reg ? "Sign In" : "Daftar sekarang";
        el.pass.autocomplete = reg ? "new-password" : "current-password";
        el.rememberWrap.classList.toggle("invisible", reg);
        showError("");
    }

    // ---------- Event ----------
    el.switchBtn.addEventListener("click", () => {
        setMode(mode === "login" ? "register" : "login");
    });

    // Form email di hero -> pindah ke form daftar
    el.heroForm.addEventListener("submit", (e) => {
        e.preventDefault();
        setMode("register");
        el.email.value = el.heroEmail.value;
        $("login").scrollIntoView({ behavior: "smooth" });
        setTimeout(() => el.pass.focus(), 400);
    });

    // Form login / daftar
    el.form.addEventListener("submit", (e) => {
        e.preventDefault();

        const email = el.email.value.trim();
        const pass = el.pass.value;

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            showError("Masukkan alamat email yang valid.");
            return;
        }
        if (pass.length < 8) {
            showError("Password minimal 8 karakter.");
            return;
        }

        saveUser({ email }, mode === "login" ? el.remember.checked : true);
        window.location.replace(HOME);
    });

    setMode("login");
})();