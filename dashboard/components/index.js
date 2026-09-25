import { Calendar } from "./Calendar.js";
import { Favicon } from "./Favicon.js";
import { Icon } from "./Icon.js";
import { ListView } from "./ListView.js";
import { MonthView } from "./MonthView.js";
import { Toolbar } from "./Toolbar.js";
import { ToolbarButton } from "./ToolbarButton.js";
import { WeekView } from "./WeekView.js";

export { Calendar, Favicon, Icon, ListView, MonthView, Toolbar, ToolbarButton, WeekView };

customElements.define("hd-calendar", Calendar);
customElements.define("hd-favicon", Favicon);
customElements.define("hd-icon", Icon);
customElements.define("hd-list", ListView);
customElements.define("hd-month", MonthView);
customElements.define("hd-toolbar", Toolbar);
customElements.define("hd-toolbar-button", ToolbarButton);
customElements.define("hd-week", WeekView);
