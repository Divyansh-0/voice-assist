import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { FiUser, FiHome, FiSettings } from "react-icons/fi";
import { db } from "../../firebase";

const Dashboard = () => {
  const [users, setUsers] = useState([]);

  const fetchHandler = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userData = [];
      querySnapshot.forEach((doc) => {
        userData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(userData);
    } catch (error) {
      console.log(error.message);
    }
  };

  useEffect(() => {
    fetchHandler();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="p-4 text-2xl font-bold">My Dashboard</div>
        <nav className="flex-1">
          <ul>
            <li className="p-4 hover:bg-blue-800 flex items-center">
              <FiHome className="mr-2" />
              Home
            </li>
            <li className="p-4 hover:bg-blue-800 flex items-center">
              <FiUser className="mr-2" />
              Users
            </li>
            <li className="p-4 hover:bg-blue-800 flex items-center">
              <FiSettings className="mr-2" />
              Settings
            </li>
          </ul>
        </nav>
        <div className="p-4 text-center border-t border-blue-800">
          © 2024 Dashboard
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-800">
            Welcome to Your Dashboard
          </h1>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            onClick={fetchHandler}
          >
            Refresh Data
          </button>
        </header>

        {/* Data Table */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            User Data
          </h2>
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">ID</th>
                <th className="py-3 px-6 text-left">Name</th>
                <th className="py-3 px-6 text-left">Email</th>
                <th className="py-3 px-6 text-left">Income</th>
                <th className="py-3 px-6 text-left">Topic</th>

                <th className="py-3 px-6 text-left">User Sentiment</th>

                <th className="py-3 px-6 text-left">AI Sentiment</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-200 hover:bg-gray-100"
                  >
                    <td className="py-3 px-6 text-left">{user.id}</td>
                    <td className="py-3 px-6 text-left">{user.name}</td>
                    <td className="py-3 px-6 text-left">{user.email}</td>
                    <td className="py-3 px-6 text-left">{user.income}</td>
                    <td className="py-3 px-6 text-left">{user.topic}</td>

                    <td className="py-3 px-6 text-left">
                      {user.user_sentiment}
                    </td>

                    <td className="py-3 px-6 text-left">{user.ai_sentiment}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="py-3 px-6 text-center">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
