import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class minefield extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        this.mines = [] //store the x and z location of each mine 

        let x = 0
        let z = 0
        
        //initalize 10 randomly placed mines 
        //in future we need to guanantee non-collision between mines that spawn
        for(let i = 0; i < 10; i++){
            x = (Math.random() * 2 - 1) * 10
            z = -1 * Math.random() * 10

            this.mines.push([x, z])
        }


//         this.spawnDistance = 10

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            axis : new defs.Axis_Arrows()

        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, specularity: 1, diffusivity: .6, color: hex_color("#ffffff")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("View origin", ["Control", "0"], () => this.attached = () => this.initial_camera_location);
        this.new_line();
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);


        // TODO:  Fill in matrix operations and drawing code to draw the solar system scene (Requirements 3 and 4)
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();
        
        //ligthing
        const light_position = vec4(0, 0, 0, 1);

        program_state.lights = [new Light(light_position, color(0, 0, 0, 1), 10000)]

        //spawn minefield in front of camera

        //despawn mines after they pass the camera 
        //how many? start with 10 on screen at all times, 

        //they will spawn some distance x away from the camera
        

        let mine_transform = Mat4.identity()
        
        let spawnDistance = 10


        
        //need to make z increase on each iteration
            
        for(let i = 0; i < this.mines.length; i++){

            
            mine_transform = Mat4.identity().times(Mat4.translation(this.mines[i][0], 0, this.mines[i][1] - spawnDistance))
            this.mines[i][1] += 0.1
            this.shapes.sphere.draw(context, program_state, mine_transform, this.materials.test)


            //check if any have passed the camera
            if (this.mines[i][1] > 22){
                //re-initalize the mine (delete and spawn new mine)
                this.mines[i][0] = (Math.random() * 2 - 1) * 10
                this.mines[i][1] = -1 * Math.random() * 10
            }
             
        }


        

        //use random number generator

        //have mines all move closer to the camera, each mine needs its own transformation matrix
        

        this.shapes.axis.draw(context, program_state, Mat4.identity(), this.materials.test)




    }
}

