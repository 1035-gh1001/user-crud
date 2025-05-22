import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import Axios from 'axios';

import UserForm from './UserForm';
import UserTable from './UserTable';

const apiUrl = process.env.REACT_APP_API_BASE_URL;

const Users = () => {
    const [users, setUsers] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const [selectedUser, setSelectedUser] = useState({});
    const [isEdit, setIsEdit] = useState(false);

    useEffect(() => {
        getUsers();
    }, []);

    const getUsers = () => {
        Axios.get(`${apiUrl}/users`)
            .then(response => {
                setUsers(response?.data?.response || []);
            })
            .catch(error => {
                console.error('Axios error: ', error);
            });
    };

    const addUser = (data) => {
        setSubmitted(true);

        const payload = {
            id: data.id,
            name: data.name,
        };

        Axios.post(`${apiUrl}/createuser`, payload)
            .then(() => {
                getUsers();
                setSubmitted(false);
            })
            .catch(error => {
                console.error('Axios error: ', error);
            });
    };

    const updateUser = (data) => {
        setSubmitted(true);

        const payload = {
            id: data.id,
            name: data.name,
        };

        Axios.post(`${apiUrl}/updateuser`, payload)
            .then(() => {
                getUsers();
                setSubmitted(false);
                isEdit && setIsEdit(false);
            })
            .catch(error => {
                console.error('Axios error: ', error);
            });
    };

    const deleteUser = (data) => {
        Axios.post(`${apiUrl}/deleteuser`, data)
            .then(() => {
                getUsers();
            })
            .catch(error => {
                console.error('Axios error: ', error);
            });
    };

    return (
        <Box
            sx={{
                width: 'calc(100% - 100px)',
                margin: 'auto',
                marginTop: '100px',
            }}
        >
            <UserForm
                submitted={submitted}
                data={selectedUser}
                isEdit={isEdit}
                addUser={addUser}
                updateUser={updateUser}
            />
            <UserTable
                rows={users}
                selectedUser={data => {
                    setSelectedUser(data);
                    setIsEdit(true);
                }}
                deleteUser={data => {
                    window.confirm('Are you sure?') && deleteUser(data);
                }}
            />
        </Box>
    );
};

export default Users;
