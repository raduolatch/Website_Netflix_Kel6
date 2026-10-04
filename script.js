(() => {
    const $ = (id) => document.getElementById(id);

    /* ---------- Data film (ganti dengan data / poster milikmu) ---------- */
    const ROWS = [
        {
            id: "row-trending", title: "Trending Sekarang", items: [
                ["Midnight Run", "Thriller", "m1"], ["Neon Harbor", "Sci-Fi", "m2"], ["The Last Ember", "Drama", "m3"],
                ["Paper Kingdom", "Animasi", "m4"], ["Salt & Static", "Misteri", "m5"], ["Glass Orchard", "Romansa", "m6"],
                ["Iron Tide", "Aksi", "m7"], ["Quiet Hours", "Drama", "m8"]
            ]
        },
        {
            id: "row-new", title: "Baru Ditambahkan", items: [
                ["Red Lantern", "Kriminal", "n1"], ["Moonlit Road", "Petualangan", "n2"], ["Echo Valley", "Horor", "n3"],
                ["Sunday Fire", "Komedi", "n4"], ["Deep Signal", "Sci-Fi", "n5"], ["Harbor Lights", "Drama", "n6"],
                ["Cold Orbit", "Sci-Fi", "n7"], ["Tiny Giants", "Keluarga", "n8"]
            ]
        },
        {
            id: "row-series", title: "Series Populer", items: [
                ["Kota Kedua", "Series", "s1"], ["Rumah Kaca", "Series", "s2"], ["Bayang Malam", "Series", "s3"],
                ["Jejak Api", "Series", "s4"], ["Lorong Waktu", "Series", "s5"], ["Garis Tipis", "Series", "s6"],
                ["Pasar Senja", "Series", "s7"], ["Langit Abu", "Series", "s8"]
            ]
        },
    ];

    // untuk hilight poster saat hover
    function renderRows() {
        const root = $("rows");
        root.textContent = "";
        
        // Ambil elemen layar gelap dari HTML
        const pageOverlay = document.getElementById("page-overlay");

        ROWS.forEach((row) => {
            const sec = document.createElement("section");
            sec.id = row.id;
            sec.className = "scroll-mt-24 mb-8";
            
            const h2 = document.createElement("h2");
            h2.className = "px-4 pb-1 text-lg font-bold sm:px-10 sm:text-xl lg:px-14 relative z-30";
            h2.textContent = row.title;
            
            const track = document.createElement("div");
            track.className = "flex overflow-x-auto gap-3 md:gap-4 px-4 sm:px-10 lg:px-14 py-6 no-scrollbar";
            
            row.items.forEach(([title, genre, seed]) => {
                const card = document.createElement("a");
                card.href = "#"; 
                
                card.className = "relative shrink-0 w-32 md:w-48 aspect-[2/3] cursor-pointer transition-transform duration-300 hover:scale-110 hover:z-50 group origin-center rounded-md"; 
                card.dataset.title = title.toLowerCase();
                card.setAttribute("aria-label", title);
                card.addEventListener("click", (e) => e.preventDefault());
                
                card.addEventListener("mouseenter", () => {
                    if (pageOverlay) pageOverlay.classList.remove("hidden");
                });
                card.addEventListener("mouseleave", () => {
                    if (pageOverlay) pageOverlay.classList.add("hidden");
                });

                const img = document.createElement("img");
                img.src = `https://picsum.photos/seed/${seed}/400/600`;
                img.alt = ""; 
                img.loading = "lazy";
                img.className = "absolute inset-0 w-full h-full rounded-md shadow-lg object-cover";

                const infoLayer = document.createElement("div");
                infoLayer.className = "absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md";
                
                const titleEl = document.createElement("b");
                titleEl.className = "text-white text-sm md:text-base leading-tight drop-shadow-md mb-1";
                titleEl.textContent = title;
                
                const genreEl = document.createElement("span");
                genreEl.className = "text-brand text-[10px] md:text-xs font-bold mb-1";
                genreEl.textContent = genre;
                
                const sinopsisEl = document.createElement("p");
                sinopsisEl.className = "text-white/80 text-[10px] line-clamp-3 leading-snug";
                sinopsisEl.textContent = "Kisah mendebarkan tentang petualangan tak terduga yang menguji batas keberanian. Saksikan bagaimana karakter utama bertahan menghadapi rintangan.";
                
                infoLayer.append(titleEl, genreEl, sinopsisEl);
                card.append(img, infoLayer); 
                track.append(card);
            });
            
            sec.append(h2, track); 
            root.append(sec);
        });
    }

    const el = {
        heroForm: $("hero-form"), heroEmail: $("email"),
        box: $("auth-box"), title: $("auth-title"), form: $("auth-form"),
        email: $("login-email"), pass: $("login-pass"), remember: $("remember"),
        rememberWrap: $("remember-wrap"), error: $("auth-error"), submit: $("auth-submit"),
        switchText: $("switch-text"), switchBtn: $("switch-mode"),
    };
    let mode = "login";

    const KEY = "netplik_user";
    function getUser() {
        try { return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY)); } catch { return null; }
    }
    function saveUser(user, remember) {
        try { (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(user)); } catch { }
    }
    function showError(msg) { el.error.textContent = msg; el.error.classList.toggle("hidden", !msg); }
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

    function setUser(user) {
        if (user) { window.location.replace("home.html"); return; }
        const loggedIn = !!user;
        $("landing-view").classList.toggle("hidden", loggedIn);
        $("app-view").classList.toggle("hidden", !loggedIn);
        document.title = loggedIn ? "Beranda - Netplik" : "Netplik";
        if (loggedIn) {
            $("avatar").textContent = user.email[0].toUpperCase();
            $("menu-email").textContent = user.email;
            if (!$("rows").children.length) renderRows();
            onScroll();
        }
        window.scrollTo(0, 0);
    }

    function logout() {
        try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch { }
        closeMenus();
        setUser(null);
        setMode("login");
    }

    el.switchBtn.addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));

    el.heroForm.addEventListener("submit", (e) => {
        e.preventDefault();
        setMode("register");
        el.email.value = el.heroEmail.value;
        $("login").scrollIntoView({ behavior: "smooth" });
        setTimeout(() => el.pass.focus(), 400);
    });

    el.form.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = el.email.value.trim() || "tamu@netplik.com";
        saveUser({ email }, mode === "login" ? el.remember.checked : true);
        window.location.replace("home.html");
    });

    const nav = $("navbar");
    function onScroll() { nav.classList.toggle("solid", window.scrollY > 40); }
    window.addEventListener("scroll", onScroll, { passive: true });

    function closeMenus() {
        $("profile-menu").classList.add("hidden");
        $("profile-btn").setAttribute("aria-expanded", "false");
        $("nav-links").classList.remove("open");
        $("menu-btn").setAttribute("aria-expanded", "false");
    }
    $("profile-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const open = $("profile-menu").classList.toggle("hidden") === false;
        $("profile-btn").setAttribute("aria-expanded", String(open));
    });
    $("menu-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const open = $("nav-links").classList.toggle("open");
        $("menu-btn").setAttribute("aria-expanded", String(open));
        nav.classList.add("solid");
    });
    $("nav-links").addEventListener("click", closeMenus);

    function filterRows() {
        const q = $("search-input").value.trim().toLowerCase();
        let any = false;
        document.querySelectorAll("#rows section").forEach((sec) => {
            let n = 0;
            sec.querySelectorAll(".poster").forEach((p) => {
                const show = !q || p.dataset.title.includes(q);
                p.classList.toggle("hidden", !show);
                if (show) n++;
            });
            sec.classList.toggle("hidden", n === 0);
            if (n) any = true;
        });
        $("no-results").classList.toggle("hidden", any);
    }
    $("search-input").addEventListener("input", filterRows);
    $("search-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const f = $("search-form");
        if (window.innerWidth < 640 && !f.classList.contains("open") && !$("search-input").value) {
            f.classList.add("open"); $("search-input").focus();
        } else filterRows();
    });

    document.addEventListener("click", (e) => { if (!e.target.closest("#profile-menu")) $("profile-menu").classList.add("hidden"); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });
    $("logout-btn").addEventListener("click", logout);
    setUser(getUser());

document.addEventListener("DOMContentLoaded", () => {
    // 1. Observer Scroll Reveal (Bawaan lo)
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    const sections = document.querySelectorAll(".reveal-section");
    sections.forEach(sec => observer.observe(sec));

    // 2. FAQ Accordion Handler (Tambahan)
    document.querySelectorAll('.faq-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const content = toggle.nextElementSibling;
            const icon = toggle.querySelector('.faq-icon');
            content.classList.toggle('hidden');
            icon.classList.toggle('rotate-180');
        });
    });
});

const faqToggles = document.querySelectorAll('.faq-toggle');
    faqToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const content = toggle.nextElementSibling;
            const icon = toggle.querySelector('.faq-icon');
            if (content) content.classList.toggle('hidden');
            if (icon) icon.classList.toggle('rotate-180');
        });
    });


    document.addEventListener("click", (e) => { 
        const pm = $("profile-menu");
        if (pm && !e.target.closest("#profile-menu")) pm.classList.add("hidden"); 
    });
    
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenus(); });
    
    if ($("logout-btn")) {
        $("logout-btn").addEventListener("click", logout);
    }

    if ($("landing-view") && $("app-view")) {
        setUser(getUser());
    }

// FAQ Accordion Handler 
    document.addEventListener("click", (e) => {
        const toggle = e.target.closest(".faq-toggle");
        if (!toggle) return;

        const content = toggle.nextElementSibling;
        const icon = toggle.querySelector(".faq-icon");

        if (content) content.classList.toggle("hidden");
        if (icon) icon.classList.toggle("rotate-180");
    });

})(); 