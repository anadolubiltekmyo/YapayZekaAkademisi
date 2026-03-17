// ==========================================
// AI Web Rehberi — JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    // ---- Mobile Navigation Toggle ----
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
    });

    // Close menu on link click
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });

    // ---- Navbar scroll effect ----
    const navbar = document.getElementById('navbar');
    
    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ---- Back to Top Button ----
    const backToTop = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 600) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }, { passive: true });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ---- Scroll Animations (Intersection Observer) ----
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add fade-in class to animatable elements
    const animatableSelectors = [
        '.tool-card',
        '.principle-card',
        '.project-card',
        '.edit-card',
        '.fundamental-card',
        '.concept-card',
        '.method-card',
        '.alt-hosting-card',
        '.backend-card',
        '.workaround-item',
        '.platform-card',
        '.comparison-box',
        '.hosting-hero-card',
        '.devtools-section',
        '.tip-box',
        '.checklist-item',
        '.fb-card',
        '.fb-analogy',
        '.sd-card',
        '.storage-item',
        '.limit-item',
        '.resource-card'
    ];

    animatableSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((el, index) => {
            el.classList.add('fade-in');
            el.style.transitionDelay = `${index * 0.05}s`;
            observer.observe(el);
        });
    });

    // ---- Active Navigation Highlight ----
    const sections = document.querySelectorAll('section[id]');
    
    const highlightNav = () => {
        const scrollY = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navMenu.querySelectorAll('a').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', highlightNav, { passive: true });

    // ---- Checklist persistence (localStorage) ----
    const checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
    
    // Load saved state
    checkboxes.forEach(cb => {
        const saved = localStorage.getItem(`checklist_${cb.id}`);
        if (saved === 'true') {
            cb.checked = true;
        }
    });

    // Save state on change
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            localStorage.setItem(`checklist_${cb.id}`, cb.checked);
        });
    });

});

// ---- Copy Prompt Function ----
function copyPrompt(button) {
    const promptText = button.closest('.project-prompt').querySelector('.prompt-text').textContent;
    
    navigator.clipboard.writeText(promptText).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Kopyalandı!';
        button.style.background = '#10b981';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = promptText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            button.textContent = '✓ Kopyalandı!';
            button.style.background = '#10b981';
            setTimeout(() => {
                button.textContent = 'Kopyala';
                button.style.background = '';
            }, 2000);
        } catch (err) {
            button.textContent = 'Hata!';
            setTimeout(() => {
                button.textContent = 'Kopyala';
            }, 2000);
        }
        
        document.body.removeChild(textArea);
    });
}
