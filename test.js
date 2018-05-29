const tiles = [
  { name: "main", image: "./test-tiles/18-02-02--01.png" },
  { name: "bricks-C", image: "main", sx: 32, sy: 32},
  { name: "bricks-L", image: "main", sx: 0, sy: 32},
  { name: "bricks-T", image: "main", sx: 32, sy: 0},
  { name: "bricks-TL", image: "main", sx: 0, sy: 0},
  { name: "bricks-R", image: "main", sx: 64, sy: 32},
  { name: "bricks-TR", image: "main", sx: 64, sy: 0},
  { name: "cogs-gold", image: "main", sx: 96, sy: 32},
  { name: "cogs-silver", image: "main", sx: 96, sy: 64},
  { name: "border-T", image: "main", sx: 160, sy: 0},
  { name: "border-TL", image: "main", sx: 128, sy: 0},
  { name: "border-TR", image: "main", sx: 192, sy: 0},
  { name: "border-L", image: "main", sx: 128, sy: 32},
  { name: "border-BL", image: "main", sx: 128, sy: 64},
  { name: "sidewalk", image: "main", sx: 0, sy: 64},
  { name: "sidewalk-variant", image: "main", sx: 32, sy: 64},
  { name: "road", image: "main", sx: 0, sy: 98},
  { name: "road-dashed", image: "main", sx: 32, sy: 98},
  { name: "road-stop-bottom", image: "main", sx: 64, sy: 98},
  { name: "test-1", image: "", color: "#ffffff"},
  { name: "test-2", color: "#a8a8a8"}
];

var scene, pworld, tileset, world;

window.onload = function() {
  scene = new PScene(document.getElementById("scene-main"));
  scene.uninterpolate();
  pworld = new PWorld({
    scale_x: 2,
    scale_y: 2
  });
  scene.bind_world(pworld);
  tileset = new PTileset();
  pworld.bind_tileset(tileset);

  world = new NWorld(pworld, {gravityY: 0.2});

  {
    let lastTick = performance.now();
    let keyLeft = false, keyRight = false;
    pworld.onBeforeDraw = function() {
      tick = performance.now();
      if (keyLeft) {
        world.entities[0].velx -= 0.1;
      }
      if (keyRight) {
        world.entities[0].velx += 0.1
      }
      world.entities[0].velx *= 0.95;
      world.tick(tick - lastTick);
      lastTick = tick;
    }
    document.addEventListener("keydown", e => {
      if (e.code == "ArrowLeft") keyLeft = true;
      if (e.code == "ArrowRight") keyRight = true;
      if (e.code == "ArrowUp") world.entities[0].vely = -4;
    });
    document.addEventListener("keyup", e => {
      if (e.code == "ArrowLeft") keyLeft = false;
      if (e.code == "ArrowRight") keyRight = false;
    });
  }

  world.add_block(new PBlock("road-dashed", "test-1"), 1, 4, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 2, 4, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 3, 4, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 3, 5, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 4, 5, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 4, 6, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 5, 6, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 6, 6, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 7, 6, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 7, 5, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 7, 4, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 8, 4, 0);
  world.add_block(new PBlock("road-dashed", "test-1"), 5, 3, 0);

  world.activate_layer(0);

  let entity = new PEntity(48, 16, 16, 16, "test-2", "test-2");
  entity.vely = -2;
  entity.velx = 0;
  world.add_entity(entity);

  tileset.add(tiles, null, {swidth: 32, sheight: 32, sx: -1, sy: -1});
  scene.loop(true);

  window.onresize = function() {
    scene.update_size();
  }
}
