const btnCopySVG =
    `<svg class="copy-btn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;

const btnCopiedSVG =
    `<svg class="copy-btn copy-btn-clicked" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none"><path stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6.5 17l6 6 13-13"/></svg>`;

function toggleMenu() {
    const menuLinks = document.getElementById("menu-links");
    const isOpen = menuLinks.classList.toggle("active");

    const downArrow = document.getElementById("down-arrow");
    const upArrow = document.getElementById("up-arrow");

    downArrow.style.display = isOpen ? "none" : "block";
    upArrow.style.display = isOpen ? "block" : "none";
}

async function handleCopyBtnClick(btnContainer) {
    let text = btnContainer.parentElement.querySelector("code").innerText;
    await navigator.clipboard.writeText(text);

    // Visual feedback that task is completed
    btnContainer.innerHTML = btnCopiedSVG;
    setTimeout(() => {
        btnContainer.innerHTML = btnCopySVG;
    }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
    // Make menu interactive on mobile
    const downArrow = document.getElementById("down-arrow");
    const upArrow = document.getElementById("up-arrow");
    downArrow.addEventListener("click", toggleMenu);
    upArrow.addEventListener("click", toggleMenu);

    // Add copy buttons for code blocks on desktop
    if (window.innerWidth >= 768) {
        const allCodeBlocks = Array.from(
            document.querySelectorAll('pre[data-copy]')
        )
        allCodeBlocks.forEach((block) => {
            const code = block.childNodes[0];
            const btnFullHTML =
                `<div class="copy-btn-container">${btnCopySVG}</div>`;
            code.parentNode.insertAdjacentHTML('afterbegin', btnFullHTML);
        })

        const allCopyBtns =
            Array.from(document.querySelectorAll('.copy-btn-container'));
        allCopyBtns.forEach((btnContainer) => {
            btnContainer.addEventListener("click", async () => {
                await handleCopyBtnClick(btnContainer);
            });
        });
    }
});

