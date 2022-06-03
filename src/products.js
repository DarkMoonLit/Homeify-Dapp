import { ERC20_DECIMALS } from "./constants";

function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL();

  return `
      <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
        <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
            target="_blank">
            <img src="${icon}" width="48" alt="${_address}">
        </a>
      </div>
      `;
}

export function productTemplate(_product) {
  return `
        <div class="card mb-4">
          <img class="card-img-top" src="${_product.image}" alt="...">
          <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
            ${_product.forSale ? "Sale" : "Not for sale"}
          </div>
          <div class="card-body text-left p-4 position-relative">
            <div class="translate-middle-y position-absolute top-0">
            ${identiconTemplate(_product.owner)}
            </div>
            <h2 class="card-title fs-4 fw-bold mt-2">${_product.name}</h2>
            <p class="card-text mb-4" style="min-height: 82px">
              ${_product.description}             
            </p>
            <p class="card-text">
              <i class="text-muted"></i>
              <span>${_product.dimension}</span>
            </p>
            <div class="d-grid gap-2 cta-btn-${_product.index}">
              
            </div>
          </div>
        </div>
      `;
}

export function renderProducts(_products, _kit) {
  document.getElementById("marketplace").innerHTML = "";
  _products.forEach((_product) => {
    const newDiv = document.createElement("div");
    newDiv.className = "col-md-4";
    newDiv.innerHTML = productTemplate(_product);
    // Variation of Interactive Buttons based off current ownership of  each furniture
    const newButton = document.createElement("a");
    const buyBtnClassName = "btn btn-lg btn-outline-dark buy-Btn fs-6 p-3";
    const setForSaleClassName =
      "btn btn-lg btn-outline-danger setForSale-btn fs-6 p-3";
    newButton.className =
      _product.owner == _kit.defaultAccount
        ? setForSaleClassName
        : buyBtnClassName;
    newButton.id = _product.index;
    const buyBtnText = `Buy for ${_product.price
      .shiftedBy(-ERC20_DECIMALS)
      .toFixed(2)} cUSD`;
    const setForSaleText = `Change forSale to ${
      _product.forSale ? "Not for sale" : "For sale"
    }`;
    newButton.innerHTML =
      _product.owner == _kit.defaultAccount ? setForSaleText : buyBtnText;

    document.getElementById("marketplace").appendChild(newDiv);
    document.querySelector(`.cta-btn-${_product.index}`).appendChild(newButton);
  });
}
