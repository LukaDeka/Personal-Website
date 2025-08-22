function toggleMenu() {
	const menuLinks = document.getElementById("menu-links");
	const isOpen = menuLinks.classList.toggle("active");

	const downArrow = document.getElementById("down-arrow");
	const upArrow = document.getElementById("up-arrow");

	downArrow.style.display = isOpen ? "none" : "block"
	upArrow.style.display = isOpen ? "block" : "none"
}

async function handleCopyBtnClick(block, button) {
	let text = block.querySelector("code").innerText;

	await navigator.clipboard.writeText(text);

	// visual feedback that task is completed
	button.innerHTML = "Code Copied";
	setTimeout(() => {
		button.innerHTML = "Copy";
	}, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
	// Make menu interactive on mobile
	const downArrow = document.getElementById("down-arrow");
	const upArrow = document.getElementById("up-arrow");
	downArrow.addEventListener("click", toggleMenu);
	upArrow.addEventListener("click", toggleMenu);

	// Copy buttons for code blocks
	const allCodeBlocks = Array.from(document.querySelectorAll('pre'))
	allCodeBlocks.forEach((block) => {
		const code = block.childNodes[0]
		const btnHTML =
			`<div class="copy-button-container">` +
			`  <button class="copy-button">Copy</button>` +
			`</div>`;
		code.parentNode.insertAdjacentHTML('afterbegin', btnHTML);
	})

	const allCopyBtns = Array.from(document.querySelectorAll('.copy-button'))
	allCopyBtns.forEach((btn) => {
		btn.addEventListener("click", async () => {
			await handleCopyBtnClick(btn.parentElement.parentElement, btn);
		});
	});
});

