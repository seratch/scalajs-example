lazy val scalaJS = Project(id = "scalajs", base = file("src/main/webapp/WEB-INF/assets"),
  settings = Seq(
    name := "application", // JavaScript file name
    unmanagedSourceDirectories in Compile <+= baseDirectory(_ / "scala"),
    libraryDependencies ++= Seq(
      "org.scala-lang.modules.scalajs" %%% "scalajs-dom"                    % "0.6",
      "org.scala-lang.modules.scalajs" %%% "scalajs-jquery"                 % "0.6",
      "org.scala-lang.modules.scalajs" %%  "scalajs-jasmine-test-framework" % "0.5.4" % "test"
    ),
    crossTarget in Compile <<= baseDirectory(_ / ".." / ".." / "assets" / "js")
  )
)
