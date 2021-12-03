import {defs, tiny} from './examples/common.js';
import { Shape_From_File } from './examples/obj-file-demo.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

export class minefield extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        const initial_corner_point = vec3(-50, 0, -50);
        const row_operation = (s, p) => p ? Mat4.translation(0, .2, 0).times(p.to4(1)).to3()
            : initial_corner_point;
        const column_operation = (t, p) => Mat4.translation(.2, 0, 0).times(p.to4(1)).to3();

        const initial_corner_point2 = vec3(-30, -19, -20);
        const row_operation2 = (s, p) => p ? Mat4.translation(0, .2, 0).times(p.to4(1)).to3()
            : initial_corner_point2;
        const column_operation2 = (t, p) => Mat4.translation(.2, 0, 0).times(p.to4(1)).to3();
        
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            cylinder: new Shape_From_File("assets/sub.obj"),
            mine : new Shape_From_File("assets/boatmine.obj"),
            cube: new defs.Cube(3,3),
            horizon: new defs.Grid_Patch(100, 500, row_operation, column_operation),
            ground: new defs.Grid_Patch(100, 300, row_operation2, column_operation2)
        };

        // *** Materials
        const bump = new defs.Fake_Bump_Map(1);
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, specularity: 1, diffusivity: .6, color: hex_color("#000000")}),
            // horizon: new Material(new defs.Phong_Shader(),
            //     {ambient: 0.2, specularity: 1, diffusivity: .6, color: hex_color("#ADD8E6")}),
            horizon: new Material(bump, {ambient: 1, texture: new Texture("assets/underwater.jpg")}),
            horizon_start: new Material(bump, {ambient: 1, texture: new Texture("assets/underwaterStart.jpeg")}),
            horizon_end: new Material(bump, {ambient: 1, texture: new Texture("assets/underwaterEnd.jpeg")}),
            // ground: new Material(new defs.Phong_Shader(),
            //     {ambient: 1, specularity: 1, diffusivity: .6, color: hex_color("#ffffff")}),
            // ground: new Material(bump, {ambient: 1, texture: new Texture("assets/sand.jpg")}),
            mines: new Material(new defs.Phong_Shader(),
                {ambient: 1.0, specularity: 1, diffusivity: .6, color: hex_color("#808080")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 2, 13), vec3(0, 0, 0), vec3(0, 1, 0));
        this.player_matrix = Mat4.identity().times(Mat4.scale(2,2,2)).times(Mat4.rotation(Math.PI,0,1,0)).times(Mat4.translation(0,0,-3));
        this.horizon_matrix = Mat4.identity();
        this.ground_matrix = Mat4.identity();
        this.context = null;
        this.program_state = null;
        this.bullets = []
        this.mines = [] //store the x and z location of each mine 
        this.mines_y = [] //make sure to update this array
        this.player_y = 0;
        this.flag_3d = true;
        this.scores = [];
        this.t = 0; //constant time, used in speedup
        this.val = "START";

        let x = 0
        let y = 0
        let z = 0

        //initalize 10 randomly placed mines 
        //in future we need to guanantee non-collision between mines that spawn
        for(let i = 0; i < 60; i++){
            x = (Math.random() * 2 - 1) * 10
            y = (Math.random() * 2 - 1) * 10
            z = -1 * Math.random() * 10

            this.mines.push([x, y, z])
            this.mines_y.push(y)
        }
        this.score = 0
        this.paused = false
        this.next_time = 3; //time it takes to increase the speed
        this.speedup = 0.1; //actual speedup amount

    }

    move_left() {
        if (!this.paused) {
            this.player_matrix = this.player_matrix.times(Mat4.translation(0.2,0,0));
        }
    }

    move_right() {
        if (!this.paused) {
            this.player_matrix = this.player_matrix.times(Mat4.translation(-0.2,0,0));
        }
            // this.background_matrix = this.background_matrix.times(Mat4.rotation(0.2,0.2,0,0));
    }

    move_up() {
        if (!this.paused && this.flag_3d) {
            this.player_matrix = this.player_matrix.times(Mat4.translation(0,0.2,0));
        }
        this.player_y += 0.2;
            // this.background_matrix = this.background_matrix.times(Mat4.rotation(0.2,0.2,0,0));
    }

    move_down() {
        if (!this.paused && this.flag_3d) {
            this.player_matrix = this.player_matrix.times(Mat4.translation(0,-0.2,0));
        }
        this.player_y -= 0.2;
    }

    fire_bullet() {
        var snd = new Audio("assets/laserShoot.wav"); // buffers automatically when created
        snd.play();
        this.bullets.push(this.player_matrix.times(Mat4.scale(0.1,0.1,0.1)));
    }

    pause() {
        this.paused = !this.paused;
    }

    restart() {
        this.scores.push(this.score);
        this.scores = this.scores.sort(function(a, b) {
            return a - b;
          });
        this.scores = this.scores.reverse();
        console.log(this.scores);
        console.log(typeof(this.score))
        let temp = parseInt(this.score);
        this.new_line();
        this.score = 0;
        this.bullets = [];
        this.mines = [];
        this.mines_y = [];
        this.player_matrix = Mat4.identity().times(Mat4.scale(2,2,2)).times(Mat4.rotation(Math.PI,0,1,0)).times(Mat4.translation(0,0,-3));
        this.flag_3d = true;
        this.paused = false
        this.next_time = this.t + 3;
        this.speedup = 0.1;
        for(let i = 0; i < 60; i++){
            let x = (Math.random() * 2 - 1) * 10
            let y = (Math.random() * 2 - 1) * 10
            let z = -1 * Math.random() * 10

            this.mines.push([x, y, z])
            this.mines_y.push(y)
        }
        this.start_game();
    }

    toggle_3d() {
        this.flag_3d = !this.flag_3d
        if(this.flag_3d) {
            for(let i = 0; i < this.mines.length; i++){
                //this section makes it 3d, otherwise its set to zero
                this.mines[i][1] = this.mines_y[i];
            }
            this.player_matrix[1][3] = this.player_y;

            //generate 30 more mines to add to the 3d space
            for(let i = 0; i < 30; i++){
                let x = (Math.random() * 2 - 1) * 10
                let y = (Math.random() * 2 - 1) * 10
                let z = -1 * Math.random() * 10
    
                this.mines.push([x, y, z])
                this.mines_y.push(y)
            }

        }

        else{
            //handle 2d case
            for(let i = 0; i < this.mines.length; i++){
                //set y = 0 for all 
                this.mines[i][1] = 0;
            }
            this.player_matrix[1][3] = 0;
            this.mines = this.mines.slice(0, Math.floor(this.mines.length/2))

        }
    }

    start_game() {
        this.val = "PLAY";
        var buttons = document.getElementsByTagName('button');
        while(buttons.length > 0){
            buttons[0].parentNode.removeChild(buttons[0]);
        }
        var live_strings = document.getElementsByClassName('live_string');
        while(live_strings.length > 0){
            live_strings[0].parentNode.removeChild(live_strings[0]);
        }
        var new_lines = document.getElementsByTagName('br');
        while(new_lines.length > 0){
            new_lines[0].parentNode.removeChild(new_lines[0]);
        }
        this.make_control_panel()
    }

    end_game() {
        this.val = "END";
        var buttons = document.getElementsByTagName('button');
        while(buttons.length > 0){
            buttons[0].parentNode.removeChild(buttons[0]);
        }
        var live_strings = document.getElementsByClassName('live_string');
        while(live_strings.length > 0){
            live_strings[0].parentNode.removeChild(live_strings[0]);
        }
        var new_lines = document.getElementsByTagName('br');
        while(new_lines.length > 0){
            new_lines[0].parentNode.removeChild(new_lines[0]);
        }
        this.make_control_panel()
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        if(this.val == "PLAY"){
            this.key_triggered_button("right", ["d"], () => this.move_right());
            this.key_triggered_button("left", ["a"], () => this.move_left());
            this.key_triggered_button("up", ["w"], () => this.move_up());
            this.key_triggered_button("down", ["s"], () => this.move_down());
            this.key_triggered_button("fire", ["f"], () => this.fire_bullet());
            this.key_triggered_button("paused", ["p"], () => this.pause());
            this.key_triggered_button("restart", ["r"], () => this.restart());
            this.key_triggered_button("toggle 3d", ["t"], () => this.toggle_3d());
            this.new_line();
            this.live_string(box => {
                box.textContent = "Your score is " + this.score + " so far"
            });
            this.new_line();
            this.live_string(box => {
                box.textContent = "Previous Scores: "
            });
            this.new_line();
            for(let i = 0; i <= this.scores.length-1 ; i++){
                this.live_string(box => {
                box.textContent = (i+1).toString() + ": " + this.scores[i]
            });
            this.new_line();
        }
        }
        
        else if(this.val == "START") {
            var buttons = document.getElementsByTagName('button');
            if (buttons) {
                for (var i = 0; i < buttons.length; i++) {
                buttons[i].remove();
                }
            }
            this.live_string(box => {
                box.textContent = "Welcome to Minefield! You are an underwater explorer avoiding obstacles and trying to swim to safety! To move, use the buttons shown or click them on screen. The longer you survive the more points you get!"
            });
            this.key_triggered_button("Start Game", ["s"], () => this.start_game());
        }
        else if(this.val == "END") {
            this.live_string(box => {
                box.textContent = "You lost! Here are your high scores, press the restart button to try again!"
            });
            this.key_triggered_button("restart", ["r"], () => this.restart());

        }
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        this.context = context;
        this.program_state = program_state;
        let r = 5;
        if (!context.scratchpad.controls) {
            // this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        //bullets -> 4x4 -> x: this.bullets[i][0][3], z: this.bullets[i][2][3]

        // TODO:  Fill in matrix operations and drawing code to draw the solar system scene (Requirements 3 and 4)
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        this.t = t;

        let model_transform = this.player_matrix;
        // this.ground_matrix = Mat4.identity().times(Mat4.scale(18, 5, 1)).times(Mat4.translation(0,-2,-10).times(Mat4.rotation(3,1,0,0)));

        //lighting
        const light_position = vec4(0, 0, 0, 1);

        program_state.lights = [new Light(light_position, color(0, 0, 0, 1), 10000)]
        this.shapes.cylinder.draw(context, program_state, model_transform, this.materials.test)

        if(this.val == "START") {
            this.paused = true;
            var horizon_transform = Mat4.identity().times(Mat4.translation(0,0,-50)).times(Mat4.scale(50, 50, 1));
            this.shapes.cube.draw(context, program_state, horizon_transform, this.materials.horizon_start)

        }
        else if(this.val == "PLAY") {
            this.paused = false;
            //do speedup
            if(t > this.next_time){
                this.speedup = this.speedup + 0.03;
                this.next_time += 3;
            }
            var horizon_transform = Mat4.identity().times(Mat4.scale(150, 50, 1)).times(Mat4.translation(0,0,-20));
            this.shapes.cube.draw(context, program_state, horizon_transform, this.materials.horizon)

        }
        else if(this.val == "END") {
            this.paused = true;
            var horizon_transform = Mat4.identity();
            var horizon_transform = Mat4.identity().times(Mat4.translation(0,0,-50)).times(Mat4.scale(50, 50, 1));
            this.shapes.cube.draw(context, program_state, horizon_transform, this.materials.horizon_end)

        }

        if (!this.paused) {
        // this.shapes.cube.draw(context, program_state, this.ground_matrix, this.materials.ground)
            for(let i = 0; i < this.bullets.length; i++){
                this.bullets[i] = this.bullets[i].times(Mat4.translation(0,0,1));
                this.shapes.cube.draw(context, program_state, this.bullets[i], this.materials.test);
            }
        
            //keeps elements based on condition (x[2][3] -> z coordinate (need last index (3)))
            this.bullets = this.bullets.filter(x => x[2][3] > -20);
            // this.shapes.horizon.draw(context, program_state, this.horizon_matrix, this.materials.horizon);
            // this.shapes.ground.draw(context, program_state, this.ground_matrix, this.materials.ground);

            let mine_transform = Mat4.identity()
            
            let spawnDistance = 10

            //need to make z increase on each iteration
            for(let i = 0; i < this.mines.length; i++){
                
                mine_transform = Mat4.identity().times(Mat4.translation(this.mines[i][0], this.mines[i][1], this.mines[i][2] - spawnDistance)).times(Mat4.scale(0.2,0.2,0.2))
                this.mines[i][2] += this.speedup;
                this.shapes.mine.draw(context, program_state, mine_transform, this.materials.mines)

                //check if any have passed the camera
                if (this.mines[i][2] > 20){
                    //re-initalize the mine (delete and spawn new mine)
                    this.mines[i][0] = (Math.random() * 2 - 1) * 10
                    if(this.flag_3d) {
                        this.mines[i][1] = (Math.random() * 2 - 1) * 10
                    }
                    else {
                        this.mines[i][1] = 0
                    }
                    this.mines[i][2] = -1 * Math.random() * 10
                    this.mines_y[i] = this.mines[i][1]
                    
                }
                
            }
            this.score += 100;
            var sub_x = this.player_matrix[0][3];
            var sub_y = this.player_matrix[1][3];
            var sub_z = this.player_matrix[2][3];

            for(let i = 0; i < this.mines.length; i++){
                var mines_x = this.mines[i][0];
                var mines_y = this.mines[i][1];
                var mines_z = this.mines[i][2];
                //collision between sub and mine
                if(Math.abs(sub_x-mines_x) <= 0.7 && Math.abs(sub_y-mines_y) <= 0.7 && Math.abs((sub_z+15)-mines_z) <= 5){
                    this.paused = true;
                    console.log('end');
                    this.end_game()
                    i = this.mines.length;
                    break;
                }
                for(let j = 0; j < this.bullets.length; j++) {
                    var bullet_x = this.bullets[j][0][3];
                    var bullet_y = this.bullets[j][1][3];
                    var bullet_z = this.bullets[j][2][3];
                    //have some tolerance for collision
                    //collisoin for bullets and mine r
                    if(Math.abs(bullet_x-mines_x) <= 0.7 && Math.abs(bullet_y-mines_y) <= 0.7 && Math.abs((bullet_z+15)-mines_z) <= 5){
                        //put both out of sight
                        //swap with end for O(1) deletions if too slow 
                        var snd = new Audio("assets/explosion.wav"); // buffers automatically when created
                        snd.play();
                        console.log("collision!")
                        // this.bullets.splice(j, 1);
                        // this.mines.splice(i, 1);
                        // break;
                        this.bullets[j][2][3] = -21; //put bullet out of range for cleanup later, cant mess with array length
                        this.mines[i][2] = 21;
                        this.shapes.mine.draw(context, program_state, this.bullets[j], this.materials.mines)
                        this.shapes.cube.draw(context, program_state, this.bullets[j], this.materials.test);
                        break;
    
                    }
                }
            }

        }
        else if(this.paused && this.val != "START"){
            for(let i = 0; i < this.bullets.length; i++){
                this.shapes.cube.draw(context, program_state, this.bullets[i], this.materials.test);
            }
            for(let i = 0; i < this.mines.length; i++){
                let mine_transform = Mat4.identity()
                let spawnDistance = 10
                mine_transform = Mat4.identity().times(Mat4.translation(this.mines[i][0], this.mines[i][1], this.mines[i][2] - spawnDistance)).times(Mat4.scale(0.2,0.2,0.2))
                this.shapes.mine.draw(context, program_state, mine_transform, this.materials.mines)
            }
        }

    }
}

