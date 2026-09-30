import Mailgen from "mailgen";
import NodeMailer from "nodemailer";

const sendMail = async(options) => {
    const mailGenerator = new Mailgen ({
        theme: "default",
        product:{
            name: "Task Manager",
            link:"http://localhost:8000",
        }
    });
    const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
    const emailHtml = mailGenerator.generate(options.mailgenContent) ;

    //sending the email
    const transporter = NodeMailer.createTransport({
        host: process.env.MAILTRAP_SMTP_HOST,
        port: process.env.MAILTRAP_SMTP_PORT,
        auth:{
            user: process.env.MAILTRAP_SMTP_USER,
            pass: process.env.MAILTRAP_SMTP_PASS,
        },
    });

    const mail = {
        from : "mail.taskmanager@example.com",
        to: options.email,
        subject:options.subject,
        text: emailTextual,
        html: emailHtml
    };

    try {
        await transporter.sendMail(mail)
    } catch (error) {
        console.error("Email service failed silently. Make sure that you have provided MAILTRAP credentials in the dotenv file");
        console.error("Error:",error);
    }
};

const emailVerfMailGenContent = (username , verificationUrl) =>{
    return {
        body : {
            name: username ,
            intro : "Welcome to our App! welcome aboard.",
            action:{
                instructions:
                "To verify your email please click on the following button",
                button:{
                    color:"#28395f",
                    text: "Verify your email",
                    link: verificationUrl,
                },
            },
            outro : "Need help, or have questions? Just reply to this email , we'd love to help.",
        },
    };
}

const forgotPassMailGenContent = (username , passResetUrl) =>{
    return {
        body : {
            name: username ,
            intro : "We got a request to reset the password of your account",
            action:{
                instructions:
                "To reset your email please click on the following button",
                button:{
                    color:"#a7398f",
                    text: "Reset Password",
                    link: passResetUrl,
                },
            },
            outro : "Need help, or have questions? Just reply to this email , we'd love to help.",
        },
    };
}

export{//named export
    emailVerfMailGenContent,
    forgotPassMailGenContent,
    sendMail,
};