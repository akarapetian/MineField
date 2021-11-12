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
            // ground: new Material(new defs.Phong_Shader(),
            //     {ambient: 1, specularity: 1, diffusivity: .6, color: hex_color("#ffffff")}),
            // ground: new Material(bump, {ambient: 1, texture: new Texture("assets/sand.jpg")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 2, 13), vec3(0, 0, 0), vec3(0, 1, 0));
        this.player_matrix = Mat4.identity().times(Mat4.scale(2,2,2)).times(Mat4.rotation(Math.PI,0,1,0)).times(Mat4.translation(0,0,-3));
        this.horizon_matrix = Mat4.identity();
        this.ground_matrix = Mat4.identity();
        this.context = null;
        this.program_state = null;
        this.bullets = []
        this.obstacles = []
    }

    move_left() {
            this.player_matrix = this.player_matrix.times(Mat4.translation(0.2,0,0));
    }

    move_right() {
            this.player_matrix = this.player_matrix.times(Mat4.translation(-0.2,0,0));
            // this.background_matrix = this.background_matrix.times(Mat4.rotation(0.2,0.2,0,0));
    }

    fire_bullet() {
        this.bullets.push(this.player_matrix.times(Mat4.scale(0.1,0.1,0.1)));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("right", ["d"], () => this.move_right());
        this.key_triggered_button("left", ["a"], () => this.move_left());
        this.key_triggered_button("fire", ["f"], () => this.fire_bullet());
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


        // TODO:  Fill in matrix operations and drawing code to draw the solar system scene (Requirements 3 and 4)
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = this.player_matrix;
        var horizon_transform = Mat4.identity().times(Mat4.scale(150, 50, 1)).times(Mat4.translation(0,0,-20));
        // this.ground_matrix = Mat4.identity().times(Mat4.scale(18, 5, 1)).times(Mat4.translation(0,-2,-10).times(Mat4.rotation(3,1,0,0)));

        // if(t % 10 == 0){
        //     this.obstacles.push(this.player_matrix.times(Mat4.scale(0.1,0.1,0.1)));
        // }

        //ligthing
        const light_position = vec4(0, 0, 0, 1);

        program_state.lights = [new Light(light_position, color(0, 0, 0, 1), 10000)]

        this.shapes.cylinder.draw(context, program_state, model_transform, this.materials.test)
        this.shapes.cube.draw(context, program_state, horizon_transform, this.materials.horizon)
        // this.shapes.cube.draw(context, program_state, this.ground_matrix, this.materials.ground)

        for(let i = 0; i < this.bullets.length; i++){
            this.bullets[i] = this.bullets[i].times(Mat4.translation(0,0,1));
            this.shapes.cube.draw(context, program_state, this.bullets[i], this.materials.test);
        }
        for(let i = 0; i < this.obstacles.length; i++){
            this.obstacles[i] = this.obstacles[i].times(Mat4.translation(0,0,1));
            this.shapes.cube.draw(context, program_state, this.obstacles[i], this.materials.test);
        }
        // this.shapes.horizon.draw(context, program_state, this.horizon_matrix, this.materials.horizon);
        // this.shapes.ground.draw(context, program_state, this.ground_matrix, this.materials.ground);

    }
}

