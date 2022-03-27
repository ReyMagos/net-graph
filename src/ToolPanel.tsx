import * as React from "react";

import "./ToolPanel.css"

export class ToolPanel extends React.Component<any, any> {
    render() {
        let toolButtons = [];
        for (let tool of this.props.tools) {
            if (tool instanceof Tool) {
                toolButtons.push(
                    <button className="tool-button" onClick={() => this.props.graph.setCurrentTool(tool)}>
                        <img className="tool-icon" src={tool.name + ".png"} alt="" />
                    </button>
                );
            }
            if (tool instanceof Action) {
                toolButtons.push(
                    <button className="tool-button" onClick={() => tool.onActivate()}>
                        <img className="tool-icon" src={tool.name + ".png"} alt="" />
                    </button>
                );
            }
        }
        return (
            <div id="tool-panel">
                {toolButtons}
            </div>
        )
    }
}

export class Tool {
    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

export class Action {
    name: string;
    onActivate: Function;

    constructor(name: string, onActivate: Function) {
        this.name = name;
        this.onActivate = onActivate;
    }

}
