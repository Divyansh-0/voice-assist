import { addDoc, collection } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

const Form = () => {
  const nav = useNavigate();
  const formHandler = async (e) => {
    e.preventDefault();
    console.log(e.target);
    const data = new FormData(e.target);
    const fdata = Object.fromEntries(data.entries());
    console.log(fdata);

    try {
      const docRef = await addDoc(collection(db, "users"), {
        name: fdata.name,
        email: fdata.email,
        income: fdata.income,
        topic: fdata.topic,
      });

      console.log("Document written with ID: ", docRef.id);
      sessionStorage.setItem("userID", docRef.id);
      nav("/chat");
    } catch (e) {
      console.error("Error adding document: ", e);
    }

    e.target.reset();
  };

  return (
    <div className="bg-blue-100 h-[500px] flex w-[400px]">
      <form
        action=""
        className="flex items-center justify-center flex-col w-full p-4"
        onSubmit={formHandler}
      >
        <div className="m-2 flex flex-col">
          <label htmlFor="text">Enter your name:</label>
          <input
            type="text"
            id="text"
            className="ml-2 p-2 border rounded-md"
            name="name"
          />
        </div>
        <div className="m-2 flex flex-col">
          <label htmlFor="email">Enter your mail id:</label>
          <input
            type="email"
            id="email"
            className="ml-2 p-2 border rounded-md"
            name="email"
          />
        </div>
        <div className="m-2 flex flex-col">
          <label htmlFor="income">Enter your financial income:</label>
          <input
            type="number"
            id="income"
            className="ml-2 p-2 border rounded-md"
            name="income"
          />
        </div>
        <div className="m-2 flex flex-col">
          <label htmlFor="topic">Enter the Topic of Discussion: </label>
          <input
            type="text"
            id="topic"
            className="ml-2 p-2 border rounded-md"
            name="topic"
          />
        </div>
        <button className="m-4 bg-blue-400 p-2 w-36">Sign In</button>
      </form>
    </div>
  );
};

export default Form;
