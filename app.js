// --- app.js (Optimized for Smoother Interaction) ---

document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('.project-title-link');
    const mediaContainer = document.getElementById('media-preview');

    // Mapped image data (REPLACE with actual project visual URLs)
    const projectImages = {
        'swing': 'img/swing/tapa.jpg',
        'panetto': 'img/panetto/portada.png',
        'wine': 'img/vinos/swiss.png',
        'salamanca': 'img/salamanca/',
        'vinilo': 'img/vinilo/manos.jpg',
        'guadalajara': 'images/preview-guadalajara.jpg',
        'ecos': 'images/preview-ecos.jpg',
    };

    const handleMouseEnter = (event) => {
        const projectId = event.currentTarget.dataset.projectId;
        const imageUrl = projectImages[projectId];
        const placeholder = mediaContainer.querySelector('.placeholder-text');

        if (imageUrl) {
            // OPTIMIZATION: Use an Image object to pre-load the image
            const tempImg = new Image();
            tempImg.src = imageUrl;

            // Wait for the image to load to prevent visual jump/flicker
            tempImg.onload = () => {
                // Only change the background *after* the image is fully loaded
                mediaContainer.style.backgroundImage = `url('${imageUrl}')`;
                mediaContainer.classList.add('is-active');
            };

            // Hide the placeholder text instantly
            if (placeholder) placeholder.style.opacity = 0;
        }
    };

    const handleMouseLeave = () => {
        // Remove the distortion class instantly
        mediaContainer.classList.remove('is-active');

        // Show the placeholder text again (with fade transition in CSS)
        const placeholder = mediaContainer.querySelector('.placeholder-text');
        if (placeholder) placeholder.style.opacity = 1;
    };

    // Attach event listeners to all project links
    links.forEach(link => {
        link.addEventListener('mouseenter', handleMouseEnter);
        link.addEventListener('mouseleave', handleMouseLeave);
    });
});