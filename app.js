(() => {
  const storageKey = "ml-visually-progress-v2";
  let progress = {};
  try {
    progress = JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch (error) {
    console.warn("Could not read saved learning progress.", error);
  }

  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch (error) {
      console.warn("Could not save learning progress in this browser.", error);
    }
  };

  const render = () => {
    document.querySelectorAll("[data-topic]").forEach((box) => {
      box.checked = Boolean(progress[box.dataset.topic]);
    });
    document.querySelectorAll("[data-topic-link]").forEach((link) => {
      link.classList.toggle("done", Boolean(progress[link.dataset.topicLink]));
    });
    document.querySelectorAll("[data-topic-card]").forEach((card) => {
      card.classList.toggle("done", Boolean(progress[card.dataset.topicCard]));
    });
    document.querySelectorAll("[data-module-topics]").forEach((box) => {
      const ids = box.dataset.moduleTopics.split(",");
      const completed = ids.filter((id) => progress[id]).length;
      const label = box.querySelector("[data-progress-label]");
      const bar = box.querySelector("[data-progress-bar]");
      if (label) label.textContent = `${completed} / ${ids.length} topics`;
      if (bar) bar.style.width = `${(completed / ids.length) * 100}%`;
    });
  };

  document.querySelectorAll("[data-topic]").forEach((box) => {
    box.addEventListener("change", () => {
      progress[box.dataset.topic] = box.checked;
      save();
      render();
    });
  });

  // Mobile par lambi topic list band rakho; desktop par khuli.
  const toc = document.querySelector("details.toc");
  if (toc && window.matchMedia("(max-width: 680px)").matches) toc.open = false;

  render();
})();
