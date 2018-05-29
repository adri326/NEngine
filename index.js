"use strict";

window.NWorld = class NWorld {
	constructor(pworld, settings) {
		if (pworld) { // bind NWorld with Pworld
			this.pworld = pworld;
			this.blocks = this.pworld.blocks;
			this.entities = this.pworld.entities;
			this.settings = Object.assign({}, NWorld.defaultSettings, pworld.settings, settings);
		}
		else {
			this.blocks = [];
			this.entities = [];
			this.blockset = null;
			this.settings = Object.assign({}, NWorld.defaultSettings, settings);
		}
		this.activeLayers = [];
	}

	activate_layer(z) {
		if (!this.activeLayers.includes(z)) {
			this.activeLayers.push(z);
		}
	}

	deactivate_layer(z) {
		if (this.activeLayers.includes(z)) {
			this.activeLayers.splice(this.activeLayers.indexOf(z), 1);
		}
	}

	add_block(block, x, y, z, data = {}) {
		x = Math.floor(x);
		y = Math.floor(y);
		z = Math.floor(z);
		if (!this.blocks[z]) this.blocks[z] = [];
		if (!this.blocks[z][x]) this.blocks[z][x] = [];
		if (!this.blocks[z][x][y]) this.blocks[z][x][y] = [];
		this.blocks[z][x][y] = {block, data};
		return this;
	}

	add_entity(entity) {
		this.entities.push(entity);
		return this;
	}

	bind_blockset(blockset) {
		this.blockset = blockset;
		return this;
	}

	remove_entity(entity) {
		if (typeof entity === "number") {
			this.entities.splice(entity, 1);
		}
		else if (typeof entity === "object" && this.entities.includes(entity)) {
			this.entities.splice(this.entities.indexOf(entity), 1);
		}
		return this;
	}

	tick(dt) {
		let multiplier = dt / (1000 / 60); // we expect the game to run at 60 fps
		let gravityY = this.settings.gravityY;
		let gravityX = this.settings.gravityX;

		let passive = []; // passive objects; used in collision but will not move
		let active = []; // active objects: will move

		this.blocks.filter((layer, z) => this.activeLayers.includes(z) && layer)
			.forEach((layer, z) => {
				layer.forEach((column, x) => {
					column.forEach((block, y) => {
						if (!block.ghost) passive.push([
							"block",
							block,
							x * this.settings.blockSizeX,
							y * this.settings.blockSizeY,
							this.settings.blockSizeX,
							this.settings.blockSizeY
						]);
					});
				});
			});

		this.entities.forEach((entity, index) => {
			if (!entity.ghost) {
				passive.push(["entity", entity, index]);
				if (!entity.passive) {
					active.push(["entity", entity, index]);
				}
			}
		});

		const [passiveTree, passiveAddresses] = this.build_quadtree(passive);
		//console.log(passive);

		active.forEach(([type, thing, ...address]) => {
			//console.log(thing);
			if (typeof thing.velx == "undefined") thing.velx = 0;
			if (typeof thing.vely == "undefined") thing.vely = 0;

			if (!thing.noGravity) { // gravity :D
				thing.vely += gravityY * multiplier;
				thing.velx += gravityX * multiplier;
			}

			if (thing.vely || thing.velx) { // move the entity
				let total_eta = 0;
				for (let step = 0; step < 4; step++) {
					let probableCollisions = this.quadtree_filter(
						passiveTree,
						passiveAddresses,
						passive,
						[thing.x, thing.y],
						[thing.x + thing.velx + thing.width, thing.y + thing.vely + thing.height]
					).filter((element) => element[1] != thing);

					let collisions = probableCollisions.filter(([collisionType, collisionElement, ...pos]) => {
						let elementX = collisionElement.x || pos[0];
						let elementY = collisionElement.y || pos[1];
						let elementWidth = collisionElement.width || pos[2];
						let elementHeight = collisionElement.height || pos[3];

						if (
							thing.x + thing.velx + thing.width > elementX
							&& thing.x + thing.velx < elementX + elementWidth
							&& thing.y + thing.vely + thing.height > elementY
							&& thing.y + thing.vely < elementY + elementHeight
						) {
							return true;
						}
						return false;
					});

					if (!collisions.length) {
						thing.x += thing.velx;
						thing.y += thing.vely;
						break;
					}

					else {
						// desired location for the object
						let targetX = thing.x + thing.velx;
						let targetY = thing.y + thing.vely;

						let left = false, right = false, top = false, bottom = false;

						let hits = collisions.map(([collisionType, collisionElement, ...pos]) => {
							let elementX = collisionElement.x || pos[0];
							let elementY = collisionElement.y || pos[1];
							let elementWidth = collisionElement.width || pos[2];
							let elementHeight = collisionElement.height || pos[3];

							let etaY = 0, etaX = 0;

							if (thing.vely > 0) {
								etaY = (elementY - thing.y - thing.height) / thing.vely;
							}
							else if (thing.vely < 0) {
								etaY = (elementY + elementHeight - thing.y) / thing.vely
							}

							if (thing.velx > 0) {
								etaX = (elementX - thing.x - thing.width) / thing.velx;
							}
							else if (thing.velx < 0) {
								etaX = (elementX + elementWidth - thing.x) / thing.velx
							}

							/*if (etaY > etaX || thing.velx == 0) { // hit top or bottom edge
								if (thing.vely > 0) {
									targetY = Math.min(targetY, elementY - thing.height);
								}
								else {
									targetY = Math.max(targetX, elementY + elementHeight);
								}
							}
							else if (etaX < etaY || thing.vely == 0) {
								if (thing.velx > 0) {
									targetX = Math.min(targetX, elementX - thing.width);
								}
								else {
									targetX = Math.max(targetX, elementX + elementWidth);
								}
							}
							else if (etaX == etaY) {
								if (thing.velx > 0) {
									targetX = Math.min(targetX, elementX - thing.width);
								}
								else {
									targetX = Math.max(targetX, elementX + elementWidth);
								}
								if (thing.vely > 0) {
									targetY = Math.min(targetY, elementY - thing.height);
								}
								else {
									targetY = Math.max(targetX, elementY + elementHeight);
								}
							}*/
							let eta = Math.max(etaY, etaX);
							let theta = 0;

							//if (space) console.log(etaY, etaX);

							if (etaX > etaY) { // which side has been hit - horizontal
								if (thing.velx > 0) {
									theta = 0; // right (normal angle)
								}
								else {
									theta = Math.PI; // left
								}
							}
							else { // - vertical
								if (thing.vely > 0) {
									theta = Math.PI / 2; // top
								}
								else {
									theta = Math.PI / 2 * 3; // bottom
								}
							}

							return {eta, theta};
						});

						let minimum = hits.sort((hitA, hitB) => hitA.eta - hitB.eta)[0];

						let eta = minimum.eta * (1 - total_eta);
						total_eta += eta;
						let theta = minimum.theta;


						thing.x = thing.x + thing.velx * eta * 1;// + Math.cos(theta) * eta * .1;
						thing.y = thing.y + thing.vely * eta * 1;// - Math.sin(theta) * eta * .1;

						let estate = (Math.cos(theta) * thing.vely + Math.sin(theta) * thing.velx);

						/*if (space) {
							console.log(minimum, eta, remaining, thing.x, thing.y, thing.velx, thing.vely, Math.cos(theta) * remaining, Math.sin(theta) * remaining)
						}*/

						thing.vely = estate * Math.cos(theta);
						if (thing.vely < 0.01 && thing.vely > -0.01) thing.vely = 0;
						thing.velx = estate * Math.sin(theta);
						if (thing.velx < 0.01 && thing.velx > -0.01) thing.velx = 0;
					}
				}
			}
		});
	}

	build_quadtree(elements = this.entities) {
		// TODO: add thing velocity in the algorithm
		// NOTE: branch order:
		// 0 1
		// 2 3

		if (elements.length == 0) return [{elements: []}, []];

		// tree size definition
		let xmin = elements[0].x;
		let xmax = elements[0].x + elements[0].width;
		let ymin = elements[0].y;
		let ymax = elements[0].y + elements[0].height;
		for (let x = 0; x < elements.length; x++) {
			let element = elements[x];
			if (element.x < xmin) xmin = element.x;
			if (element.x + element.width > xmax) xmax = element.x + element.width;
			if (element.y < ymin) ymin = element.y;
			if (element.y + element.height > ymax) ymax = element.y + element.height;
		}

		let tree = {};
		let untreated = [];
		let addresses = new Array(elements.length).fill(""); // used to describe the branch path taken by each element

		// base node
		tree.elements = Array.apply(null, new Array(elements.length)).map((v, i) => i);
		tree.xmin = xmin;
		tree.xmax = xmax;
		tree.ymin = ymin;
		tree.ymax = ymax;
		tree.deepness = 0;
		tree.level = 0;

		untreated.push(tree);

		// tree generation, iterative
		for (let x = 0; x < untreated.length; x++) { // for each node
			let current = untreated[x];

			if (current.elements.length > this.settings.treeThreshold) { // there are enough elements to create branches
				current.branches = Array.apply(null, new Array(4));
				let xmid = (current.xmin + current.xmax) / 2;
				let ymid = (current.ymin + current.ymax) / 2;
				for (let y = 0; y < current.elements.length; y++) {
					let element = elements[current.elements[y]];
					let branch = null; // branch in which the element could be put in

					if (element.x + element.width < xmid) { // left
						if (element.y + element.height < ymid) {
							branch = 0; // top left
						}
						else if (element.y > ymid) {
							branch = 3; // bottom left
						}
					}
					else if (element.x > xmid) { // right
						if (element.y + element.height < ymid) {
							branch = 1; // top right
						}
						else if (element.y > ymid) {
							branch = 2; // bottom right
						}
					}

					if (branch !== null) { // put the element in a branch and remove it from the active node
						if (!current.branches[branch]) {
							current.branches[branch] = {
								elements: [current.elements[y]],
								xmin: branch == 1 || branch == 2 ? xmid : current.xmin, // if branch is on the right, set xmin to xmid, otherwise to xmin
								xmax: branch == 1 || branch == 2 ? current.xmax : xmid, // '': xmax to xmax, otherwise to xmid
								ymin: branch < 2 ? current.ymin : ymid, // branch on top: ymin, otherwise ymid
								ymax: branch < 2 ? ymid : current.ymax, // ymid otherwise ymax
								level: current.level + 1
							};
							tree.deepness = Math.max(current.deepness + 1, tree.deepness)
						}
						else {
							current.branches[branch].elements.push(current.elements[y]);
						}

						addresses[current.elements[y]] += String(branch); // register branch to the element's path

						current.elements.splice(y, 1);
						y--;
					}
				}
				current.branches.filter(Boolean).forEach((branch) => {
					untreated.push(branch);
				});
			}
			untreated.splice(x, 1);
			x--;
		}

		return [tree, addresses];
	} // end build_quadtree

	quadtree_filter(tree, addresses, elements, from, to) {
		// define the movement rectangle
		let posXmin = Math.min(from[0], to[0]);
		let posXmax = Math.max(from[0], to[0]);
		let posYmin = Math.min(from[1], to[1]);
		let posYmax = Math.max(from[1], to[1]);

		let address = "";
		// addresses calculation
		let {xmin, xmax, ymin, ymax} = tree; // init xmin, xmax, ...
		for (let level = 0; level < tree.deepnes; level++) {
			let xmid = (xmin + xmax) / 2;
			let ymid = (ymid + ymax) / 2;
			if (posXmax < xmid && posYmax < ymid) {
				address += "0";
				xmax = xmid;
				ymax = ymid;
			}
			else if (posXmin >= xmid && posYmax < ymid) {
				address += "1";
				xmin = xmid;
				ymax = ymid;
			}
			else if (posXmax < xmid && posYmin >= ymid) {
				address += "2";
				xmax = xmid;
				ymin = ymid;
			}
			else if (posXmin >= xmid && posYmin >= ymid) {
				address += "3";
				xmin = xmid;
				ymin = ymid;
			}
			else {
				break;
			}
		}


		return addresses.map((addr, i) => {
			if (address.startsWith(addr)) {
				return elements[i];
			}
		}).filter(Boolean);
	}
}

NWorld.defaultSettings = {
	treeThreshold: 2,
	gravityY: 0.1,
	gravityX: 0,
	blockSizeX: 32,
	blockSizeY: 32
};
