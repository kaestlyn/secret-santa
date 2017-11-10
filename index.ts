"use strict";

const data = require("../data/members.json");
const settings = require("../data/settings.json");

import Remarkable = require('Remarkable');

const send = require('gmail-send')(settings.email);

class Startup {
    public static main(): number {
        let ss = new SecretSanta();
        let res = ss.assign();

        ss.notifyOwner();
        // ss.notifyMembers();

        return 0;
    }
}

class SecretSanta {
    public owner: any;
    public members: SantaMember[] = [];
    private tableHeader = 
`
# List of Assignments

| Person | Assigned To | Address |
| --- | --- | --- |
`;

    public constructor() {
        this.owner = settings.owner;

        data.forEach( m => {
            this.members.push( new SantaMember( m.name, m.email, m.address ) );
        });
    }

    public assign(): boolean {
        let assigned: SantaMember[] = [];

        this.members.forEach( m => {
            let count = 0;
            let success = false;
            while( !success ) {
                if ( count++ > 50 ) {
                    break;
                }
                // check that it's possible to assign them to someone?
                const rand = this.members[Math.floor(Math.random() * this.members.length)];
                if ( assigned.indexOf( rand ) > -1 || m == rand) continue;
                assigned.push( rand );
                m.secret = rand;
                success = true;
            }
            if (!success ) {
                console.log( "Unable to assign " + m.name );
                return false;
            }
        } );
        return true;
    }

    public notifyOwner() {
        let md = new Remarkable();

        let assignments = this.tableHeader;
        
        this.members.forEach( m => {
            // console.log( m.name + " -> " + m.secret.name );
            assignments += m.toAssignmentMD() + "\n";
        } );

        let html = md.render( assignments );
        html = html.replace( "<table>", '<table style="border: 1px solid black; border-collapse: collapse">');
        html = html.replace( /<th>/g, '<th style="border: 1px solid black;">');
        html = html.replace( /<td>/g, '<td style="border: 1px solid black;padding: 3px 5px;">');

        send({
            "to": this.owner.email,
            "subject": "Secret Santa - Top Secret Assignments!",
            "html": html
        }, (err,res) => {
            console.log( "Err: " + err );
            console.log( "Res: " + res );
        });
    }

    public notifyMembers() {
        const md = new Remarkable();

        this.members.forEach( m => {
            send({
                "to": m.email,
                "subject": "Secret Santa - Your Assignment!",
                "html": md.render(`Dear ${m.name}:\n\nYou've been assigned **${m.secret.name}**.\n\nTheir address is:\n\n${m.secret.address}\n\nThanks!\n\nSanta Clause`)
            }, (err,res) => {
                console.log( "Err: " + err );
                console.log( "Res: " + res );
            });
        } );
    }
}

class SantaMember {
    public name: string;
    public email: string;
    public address: string;
    public secret: SantaMember;

    public constructor( name: string, email: string, address: string ) {
        this.name = name;
        this.email = email;
        this.address = address;
    }

    public toAssignmentMD(): string {
        return `| ${this.name} | ${this.secret.name} | ${this.secret.address} |`;
    }
}

Startup.main();