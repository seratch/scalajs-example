import scala.scalajs.js
import js.annotation.JSExport

@JSExport
object Sample {

  @JSExport
  def twice(s: String): String = {
    val ss = s * 2
    println(ss)
    ss
  }
}

