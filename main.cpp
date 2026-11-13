#include <FL/Fl.H>
#include <FL/Fl_Window.H>
#include <FL/Fl_Button.H>
#include <FL/fl_ask.H>

void button_callback(Fl_Widget* w, void*) {
    fl_alert("R3DPR1NT S2UD10Z: FLTK Engine Online!");
}

int main(int argc, char **argv) {
    Fl_Window *window = new Fl_Window(400, 200, "Arcade Studio // FLTK Diagnostic");
    
    Fl_Button *button = new Fl_Button(100, 75, 200, 50, "TEST PIPELINE");
    button->callback(button_callback);

    window->end();
    window->show(argc, argv);
    
    return Fl::run();
}
