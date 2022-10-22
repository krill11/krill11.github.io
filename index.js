"use strict";
document.getElementById("email-icon").onclick = (e) => {
  navigator.clipboard.writeText("kirill@lutsenko.com");
  let tooltip = document.createElement("div");
  tooltip.innerHTML = "Copied!";
  tooltip.classList.add("tooltip");
  document.getElementById("email-icon").appendChild(tooltip);
  setTimeout(() => tooltip.style.opacity = 1, 100);
  setTimeout(() => {
    tooltip.style.opacity = 0;
    setTimeout(()=> document.getElementById("email-icon").removeChild(tooltip), 500);
  }, 1000);
};

document.getElementById("twitter-icon").onclick = (e) => {
  let tooltip = document.createElement("div");
  tooltip.innerHTML = "Don't actually have one";
  tooltip.classList.add("tooltip");
  document.getElementById("twitter-icon").appendChild(tooltip);
  setTimeout(() => tooltip.style.opacity = 1, 100);
  setTimeout(() => {
    tooltip.style.opacity = 0;
    setTimeout(()=> document.getElementById("twitter-icon").removeChild(tooltip), 500);
  }, 1000);
};

document.getElementById("insta-icon").onclick = (e) => {
  let tooltip = document.createElement("div");
  tooltip.innerHTML = "Don't actually have one";
  tooltip.classList.add("tooltip");
  document.getElementById("insta-icon").appendChild(tooltip);
  setTimeout(() => tooltip.style.opacity = 1, 100);
  setTimeout(() => {
    tooltip.style.opacity = 0;
    setTimeout(()=> document.getElementById("insta-icon").removeChild(tooltip), 500);
  }, 1000);
};