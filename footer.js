function setupFooter() {
  if (document.querySelector(".footer-links")) {
    return;
  }

  let footer = document.querySelector("footer");

  if (!footer) {
    footer = document.createElement("footer");
    const copy = document.createElement("p");
    copy.textContent = "\u00a9 Kiln";
    footer.append(copy);
    document.body.append(footer);
  }

  const links = document.createElement("p");
  links.className = "footer-links";

  const items = [
    ["Terms", "terms.html"],
    ["Privacy", "privacy.html"],
    ["Contact", "mailto:" + CONTACT_EMAIL]
  ];

  for (const item of items) {
    const link = document.createElement("a");
    link.textContent = item[0];
    link.href = item[1];
    links.append(link);
  }

  footer.firstElementChild.after(links);

  for (const link of document.querySelectorAll("a.contact-email")) {
    link.href = "mailto:" + CONTACT_EMAIL;
    link.textContent = CONTACT_EMAIL;
  }
}

setupFooter();