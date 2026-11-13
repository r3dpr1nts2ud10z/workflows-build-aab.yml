{ pkgs }: {
  deps = [
    pkgs.try
    pkgs.gradle_7
    pkgs.mailutils
    pkgs.pwdsafety
    pkgs.xvfb-run
    pkgs.fltk
    pkgs.cmake
    pkgs.gcc
    pkgs.pkg-config
    pkgs.xorg.libX11
    pkgs.xorg.libXext
    pkgs.xorg.libXinerama
    pkgs.xorg.libXcursor
    pkgs.xorg.libXfixes
    pkgs.xorg.libXrender
    pkgs.libGL
  ];
}
