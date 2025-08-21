window.addEventListener("DOMContentLoaded", (event) => {
	const upArrow = document.getElementById("up-arrow");
	const downArrow = document.getElementById("down-arrow");
	const menuLinks = document.getElementById("menu-links");
	downArrow.addEventListener("click", toggleMenu);
	upArrow.addEventListener("click", toggleMenu);

	function toggleMenu() {
		const isOpen = menuLinks.classList.toggle("active");
		if (isOpen) {
			downArrow.style.display = "none";
			upArrow.style.display = "block";
		} else {
			downArrow.style.display = "block";
			upArrow.style.display = "none";
		}
	}
});

